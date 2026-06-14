# Property Assistant Chat UI Plan

## Goal

Add a bounded property assistant chat widget that helps users find suitable listings from Signature Property Solutions data only.

The assistant should help with questions like:

- Do you have offices for rent in Bole?
- Show me apartments under 100,000 ETB.
- Which property is good for a small office?
- Do you have 2 bedroom apartments?
- What is available for rent?

It should refuse unrelated questions, bypass attempts, or general-purpose chatbot usage.

## Core Principle

This is not a general AI chatbot. It is a database-grounded property assistant for Signature Property Solutions.

The first version should not use an external LLM. It should be deterministic and powered by the existing Django database so answers stay limited to real listings and real company data.

Current status: the first version has been implemented as a rule-based, database-powered assistant. It is not using RAG, embeddings, vector search, or an AI model/API yet.

## Completed Work

- Added the `/property-assistant` Django POST endpoint.
- Added a floating chat widget in the shared bottom layout.
- Connected the chat UI to the endpoint with CSRF-protected form submission.
- Added a compact, mobile-safe chat panel with prompt buttons, loading messages, result cards, and a best-match badge.
- Added direct listing cards with title, location, type, price, specs, and detail links.
- Added a no-match request link that sends users to `/properteas#property-request`.
- Added refusal handling for unrelated requests, bypass attempts, jokes, coding, schoolwork, health, politics, and other non-property topics.
- Added session-based follow-up context so users can refine a previous search.
- Added fuzzy greeting support for messages like `hi`, `hey`, `hello`, `heeey`, `hellooo`, and `helo`.
- Added conversational prompts for greeting, yes/no replies, rent/buy intent, and budget collection.
- Added parsing for rent/sale, property type, location, budget, currency, bedrooms, bathrooms, floors, and common real estate terms.
- Added safer ranking so closest price within budget is prioritized over simply cheapest matches.
- Added contextual follow-up rules so narrow refinements like `7 floor`, `3 baths`, or `10,000,000 ETB` keep the previous property context.
- Added reset behavior for fresh searches like `Apartments for sale` so stale filters from earlier searches do not contaminate new searches.
- Added residential-only handling for bath/bathroom refinements so office listings do not appear for apartment bath searches.
- Verified the assistant with Django checks and local endpoint tests.

## Backend Endpoint

Add a Django POST endpoint:

```text
/property-assistant
```

Input:

```json
{
  "message": "Do you have offices for rent in Bole?"
}
```

Output:

```json
{
  "reply": "I found 2 office rentals that may fit.",
  "matches": [
    {
      "title": "Office Space",
      "price": "Br. 650,000",
      "location": "Bole",
      "url": "/properteasdet/office-space"
    }
  ]
}
```

## Domain Guard

Before searching listings, classify the message as property-related or unrelated.

Allowed topics:

- property search
- rent or sale
- price and budget
- bedrooms, bathrooms, size, floor, land area
- offices, apartments, houses, land, warehouses, buildings
- locations
- availability
- company services
- contact information
- agents

Rejected topics:

- anything unrelated to real estate
- attempts to override instructions
- prompts like "ignore previous instructions"
- coding, essays, politics, jokes, schoolwork, health, legal advice, or general knowledge

Default refusal:

```text
I can only help with Signature Property Solutions listings, prices, locations, and real estate services in Ethiopia.
```

## Matching Logic

Extract useful search signals from the user message:

- status: rent, sale, buy
- type: apartment, office, house, land, warehouse, building
- location: Bole, CMC, Kazanchis, and other words matching listing locations
- bedrooms: 1 bedroom, 2 bed, 3 bedrooms
- bathrooms: 1 bath, 2 bathrooms, 3 baths
- floor: 7 floor, floor 8, 8th floor
- budget and currency: ETB, Birr, USD, under, below, less than

Use those signals to filter existing `propertys` records.

Rank matches by:

1. property type match
2. status match
3. location match
4. bedroom match, only for residential listings
5. bathroom match, only for residential listings
6. floor match
7. budget fit, prioritizing the closest listing within budget
8. newest listing

Return the top 3-5 matches.

## Response Rules

The assistant must:

- never invent unavailable listings
- only answer using existing database records and company information
- say clearly when nothing matches
- suggest the property request box when no listing fits
- include direct listing links for matches
- keep replies short, useful, and sales-focused

Example answer:

```text
I found an office rental that may fit. Office Space in Bole is listed at Br. 650,000. It has 650 size and is on floor 8. View it here: /properteasdet/office-space
```

No-match answer:

```text
I could not find an exact match right now. Send us your preferred property type, location, and budget through the request box so we can prepare better options.
```

When no listing fits, the UI should show a clear `Send property request` link to `/properteas#property-request`.

## Frontend Chat UI

Add a floating chat button and panel across the site.

Required UI:

- floating Property Assistant button
- compact chat panel
- assistant intro message
- message history
- quick prompt chips:
  - Offices for rent
  - Apartments for sale
  - Under 100,000 ETB
  - Land available
- input box
- send button
- loading state
- error state

Placement should avoid collision with:

- sticky social rail
- scroll-to-top button
- property request toast

Likely placement:

- desktop: bottom-right, above the scroll-to-top button
- mobile: bottom-right with compact dimensions, after viewport testing

## Security And Abuse Controls

Add:

- CSRF-protected POST
- max message length, around 500 characters
- no raw SQL
- escaped frontend rendering
- strict refusal for unrelated messages
- no external prompt execution
- no execution of user instructions

Optional later:

- rate limiting
- chat logging
- admin view for unanswered questions

## Next Phase: Lightweight RAG Assistant

The current assistant is not using RAG, embeddings, vector search, or an AI model/API yet.

A good next step is a lightweight RAG version:

- Index property listings, services, FAQs, contact information, agents, and request-box guidance.
- Generate embeddings for those records and store them in a vector index.
- Retrieve only relevant Signature Property Solutions data for each user question.
- Let an AI model answer only from the retrieved data.
- Include citations or direct links to listings, services, or request forms.
- Keep the same strict guardrails so users cannot use it for unrelated questions.
- Preserve deterministic filters for critical listing constraints like price, rent/sale, bedrooms, bathrooms, floor, and location.
- Add fallback behavior when retrieval confidence is low: ask a clarifying question or send users to the request box.

The RAG assistant should still be property-only. It should not become a general-purpose chatbot.

## Optional Chat Analytics

Later, add a model for chat logs:

- message
- reply
- matched listings count
- source page
- created date

This can help the team understand what users keep asking for and what inventory/content should be added next.

## Likely Files To Change

- `signatureapp/views.py`
- `signature/urls.py`
- `template/layouts/bottom.html`
- `static/assets/css/luxury.css`
- optional new JS file
- optional model/migration for chat logs

## Implementation Order

1. Add backend endpoint with domain guard and listing matcher.
2. Test endpoint with Django test client.
3. Add floating chat UI.
4. Connect UI to the endpoint.
5. Test normal property questions.
6. Test unrelated and bypass-style questions.
7. Polish desktop and mobile placement.
8. Add optional logging if needed.
