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
- budget and currency: ETB, Birr, USD, under, below, less than

Use those signals to filter existing `propertys` records.

Rank matches by:

1. property type match
2. status match
3. location match
4. bedroom match, only for residential listings
5. budget fit
6. newest listing

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
I could not find an exact match right now. Please use the property request box and tell us your preferred property type, location, and budget so we can prepare better options.
```

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
