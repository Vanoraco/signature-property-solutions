#!/usr/bin/env bash

# Shared defaults for the SPS deployment commands. Override only when testing
# the scripts outside the production layout.
APP_DIR="${SPS_APP_DIR:-/var/www/signature-property-solutions}"
APP_USER="${SPS_APP_USER:-sps}"
APP_GROUP="${SPS_APP_GROUP:-www-data}"
STATE_DIR="${SPS_STATE_DIR:-/var/lib/sps}"
CONFIG_DIR="${SPS_CONFIG_DIR:-/etc/sps}"
BACKUP_ROOT="${SPS_BACKUP_ROOT:-/var/backups/sps}"
DJANGO_ENV_FILE="${SPS_DJANGO_ENV_FILE:-${CONFIG_DIR}/django.env}"
ADMIN_ENV_FILE="${SPS_ADMIN_ENV_FILE:-${CONFIG_DIR}/admin.env}"
DEPLOY_LOCK_FILE="${SPS_DEPLOY_LOCK_FILE:-/run/lock/sps-deploy.lock}"
BACKUP_LOCK_FILE="${SPS_BACKUP_LOCK_FILE:-/run/lock/sps-backup.lock}"

log() {
  printf '[%s] %s\n' "$(date --utc '+%Y-%m-%dT%H:%M:%SZ')" "$*" >&2
}

die() {
  log "ERROR: $*"
  exit 1
}

require_root() {
  [[ "${EUID}" -eq 0 ]] || die "Run this command as root (for example, with sudo)."
}

require_user() {
  id "$APP_USER" >/dev/null 2>&1 || die "System user '$APP_USER' does not exist."
}

require_commands() {
  local command_name
  for command_name in "$@"; do
    command -v "$command_name" >/dev/null 2>&1 || die "Required command is missing: $command_name"
  done
}

load_env_file() {
  local env_file="$1"
  [[ -r "$env_file" ]] || die "Environment file is not readable: $env_file"

  set -a
  # Environment files are root-owned deployment configuration.
  # shellcheck disable=SC1090
  source "$env_file"
  set +a
}

run_as_app() {
  runuser -u "$APP_USER" -- env HOME="$STATE_DIR" "$@"
}

ensure_clean_checkout() {
  local changes
  changes="$(run_as_app git -C "$APP_DIR" status --porcelain --untracked-files=normal)"
  [[ -z "$changes" ]] || {
    printf '%s\n' "$changes" >&2
    die "The production checkout has local changes. Preserve or remove them before deploying."
  }
}
