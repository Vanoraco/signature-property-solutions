'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import DataTable, { Column } from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import { Plus, Edit, Trash2 } from 'lucide-react'

interface Property {
  id: number
  property_id: string
  property_title: string
  slug: string
  price: string
  property_location: string
  property_status: string
  category_name: string
  agent_name: string
  main_image: string
  bedrooms: string
  bathrooms: string
}

export default function PropertiesPage() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Property | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: () => api.get('/properties/?page_size=100').then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/properties/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['properties'] }); setDeleteId(null) },
  })

  const columns: Column<Property>[] = [
    {
      key: 'property_title', label: 'Property',
      render: r => (
        <div className="flex items-center gap-2.5">
          {r.main_image ? <img src={r.main_image} alt="" className="w-[42px] h-[42px] rounded-lg object-cover bg-border-soft" /> : <div className="w-[42px] h-[42px] rounded-lg bg-border-soft" />}
          <div>
            <div className="font-semibold text-ink">{r.property_title}</div>
            <div className="text-[11.5px] text-text-faint font-mono">{r.property_id}</div>
          </div>
        </div>
      ),
      sortVal: r => r.property_title,
    },
    { key: 'property_location', label: 'Location', render: r => <span className="text-text-soft">{r.property_location}</span> },
    { key: 'category_name', label: 'Category', render: r => <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full bg-border-soft text-text-soft">{r.category_name}</span> },
    { key: 'price', label: 'Price', render: r => <span className="font-semibold font-mono text-ink">{r.price}</span>, sortVal: r => Number(r.price) || 0 },
    {
      key: 'property_status', label: 'Status',
      render: r => (
        <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full ${r.property_status === 'For Sale' ? 'bg-brass-tint text-brass-dark' : 'bg-success-tint text-success'}`}>
          {r.property_status}
        </span>
      ),
    },
    {
      key: 'actions', label: '',
      render: r => (
        <div className="flex items-center gap-1.5 justify-end">
          <button onClick={(e) => { e.stopPropagation(); setEditing(r); setModalOpen(true) }} className="w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center text-text-soft hover:bg-canvas hover:text-text-main">
            <Edit size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteId(r.id) }} className="w-8 h-8 rounded-lg border border-danger-tint bg-danger-tint text-danger flex items-center justify-center hover:bg-[#f6d9d6]">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Properties</div>
          <div className="page-title">All Properties</div>
          <div className="page-desc">Manage every property record shown across the site.</div>
        </div>
        <button onClick={() => { setEditing(null); setModalOpen(true) }} className="btn btn-brass">
          <Plus size={16} /> Add Property
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-border border-t-brass rounded-full animate-spin" /></div>
      ) : (
        <DataTable
          columns={columns}
          data={data?.results || []}
          searchKey="property_title"
          searchPlaceholder="Search properties..."
          onRowClick={(r) => { setEditing(r); setModalOpen(true) }}
        />
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }} title={editing ? 'Edit Property' : 'Add Property'} size="lg">
        <p className="text-text-soft text-[13.5px]">Property form will be built with React Hook Form + Zod validation.</p>
        <p className="text-text-faint text-[12px] mt-2">Coming in the next iteration with full CRUD operations.</p>
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Property" size="default">
        <p className="text-text-soft text-[13.5px]">Are you sure you want to delete this property? This action cannot be undone.</p>
        <div className="flex justify-end gap-2.5 mt-5">
          <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-lg text-[13.5px] font-semibold border border-border text-text-soft hover:bg-canvas">Cancel</button>
          <button onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="px-4 py-2 rounded-lg text-[13.5px] font-semibold bg-danger text-white hover:bg-[#b03e35]">
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
