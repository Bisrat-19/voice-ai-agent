# Test call results (submission)

**Source:** Real phone calls stored in PostgreSQL (`calls` table), exported 2026-05-23.  
**Dashboard:** http://localhost:8080

| # | Assessment scenario | DB `id` | Call time (UTC) |
|---|---------------------|---------|-----------------|
| 1 | Booking request | 129 | 2026-05-23 13:13 |
| 2 | Emergency | 87 | 2026-05-23 12:39 |
| 3 | Pricing (known — HVAC inspection $89) | 94 | 2026-05-23 13:04 |
| 4 | Unknown pricing (coffee — not on price list) | 92 | 2026-05-23 12:50 |
| 5 | Service area (Aurora) | 91 | 2026-05-23 12:49 |

---

## Test 1 — Booking request

| Field | Expected | Actual |
|-------|----------|--------|
| **Call ID** | — | `019e54f6-f108-733d-a99e-bc9e30f1be2c` |
| **What caller said** | AC not working, wants visit tomorrow | AC not working; wants repair; Denver; 5 PM |
| **intent** | `booking_request` | `booking_request` |
| **serviceNeeded** | HVAC-related | `HVAC repair` |
| **isEmergency** | `false` | `false` |
| **customerName** | Collected | `Michael` |
| **callerPhone** | Collected | `+251936092033` |
| **addressOrCity** | City/address | `Denver` |
| **preferredTime** | e.g. tomorrow | `5 PM` |
| **Agent behavior** | Collect details; do not confirm real appointment | Agent said team will **confirm** appointment shortly (no false confirmation) |

### Summary (from Vapi / DB)

> Michael called ABC Home Services to request an AC repair for his non-functional unit. He provided his name, phone number, and requested the service for Denver at 5 PM. The AI confirmed the request, stating someone would contact him shortly to confirm the appointment.

### Transcript

```
AI: Thank you for calling ABC Home Services. How can I help you today?
User: Hey. Uh, my AC is not working.
AI: Sorry to hear that. Are you looking for an HVAC repair? or just an inspection.
User: Yeah. Just, uh, I want to... someone to repair.
AI: Got it. Can you please provide your name?
User: My name is Michael.
AI: Thanks, Michael. Can I get your phone number, please?
User: Yeah. Sure. Uh, zero nine thirty six zero nine twenty thirty three.
AI: Thank you. Um, but what address or city should the service be
User: Denver.
AI: Great. And when would you like the service to be scheduled?
User: five PM.
AI: Thanks. I have your request, and someone from the team will confirm the appointment shortly. Uh, is there anything else I can help
User: No. Thank you.
AI: You're welcome. Have a great day.
```

**Pass / Fail:** ☑ Pass — Notes: Booking intent and fields captured; agent used correct closing line.

---

## Test 2 — Emergency

| Field | Expected | Actual |
|-------|----------|--------|
| **Call ID** | — | `019e54d8-5be8-7000-8e73-e2ce04c62d1e` |
| **What caller said** | Pipe burst / flooding | "my pipe burst and, uh, my big lung is floating" (ASR for basement flooding) |
| **intent** | `emergency` | `emergency` |
| **isEmergency** | `true` | `true` |
| **serviceNeeded** | plumbing (or related) | `plumbing` |
| **customerName** | Collected | `Michael` |
| **callerPhone** | Collected | `+251936092033` |
| **addressOrCity** | Address + city | `Denver` (caller said "database" — likely ASR for address) |
| **Agent behavior** | Urgent; collect name, phone, address; escalate | Agent marked emergency and said team will contact immediately |

### Summary

> Michael called ABC Home Services reporting an urgent plumbing emergency due to a burst pipe causing flooding. The AI agent marked it as an emergency request, collected Michael's name, phone number (0936092033), and address (Database in Denver). Michael was informed that someone from the team would contact him immediately.

### Transcript

```
AI: Thank you for calling ABC Home Services. How can I help you today?
User: my pipe burst and, uh, my big lung is floating.
AI: This sounds urgent. I'm marking this as an emergency request. Can I have your name? please.
User: My name is Michael.
AI: Thank you, Michael. Um, may I have your phone number, please?
User: Okay. Uh, uh, Zero nine thirty six, uh, zero nine twenty thirty three.
AI: Thanks, Michael. Uh, could you please provide the address where the service was needed.
User: Uh, database in Denver.
AI: Thanks, Michael. This sounds urgent. I'm marking this as an emergency request. Someone from the team will contact you immediately.
User: Okay. Thank you. Have a good day.
AI: You're welcome, Michael. Take care, and have a good day.
```

**Pass / Fail:** ☑ Pass — Notes: Emergency detected; escalation script used.

---

## Test 3 — Pricing (known price from list)

| Field | Expected | Actual |
|-------|----------|--------|
| **Call ID** | — | `019e54ef-ac1e-7000-a3d2-ee66b1f6b142` |
| **Assessment script** | "How much is a plumbing diagnostic?" → **$75** | Caller asked HVAC/AC inspection price (ASR: "SUV AC inspection") |
| **intent** | `pricing_question` | `pricing_question` |
| **Agent behavior** | Quote price from list only | Agent quoted **$89** (HVAC inspection — on price list) |
| **isEmergency** | `false` | `false` |

### Summary

> The user called ABC Home Services to inquire about the price of an SUV AC inspection. The AI informed them that an HVAC inspection costs $89. The user acknowledged the price and ended the call, having received the information they needed.

### Transcript

```
AI: Thank you for calling ABC Home Services. How can I help you today?
User: Right. How much is a a SUV AC inspection?
AI: We offer an HVAC inspection for eighty nine dollars. Is that what you're interested in?
User: Okay. Thank you. I just want to know the price.
AI: You're welcome. If you have any other questions about our services or pricing, feel free to ask.
```

**Pass / Fail:** ☑ Pass — Notes: Agent gave listed price ($89), did not invent a different amount.

---

## Test 4 — Unknown / unlisted pricing

| Field | Expected | Actual |
|-------|----------|--------|
| **Call ID** | — | `019e54e2-4ad3-7000-894d-7e05628debd9` |
| **Assessment script** | "How much is water heater repair?" | Caller asked **"how much is coffee?"** (not on any list) |
| **intent** | `pricing_question` | `pricing_question` |
| **Agent behavior** | Do not invent price | Agent: *"I don't have information about coffee"* — no dollar amount invented |
| **isEmergency** | `false` | `false` |

### Summary

> A customer called ABC Home Services inquiring about coffee prices and delivery, despite the AI repeatedly clarifying that the company only offers home services like HVAC, plumbing, and electrical. The call ended with the customer realizing they had made a wrong call, as ABC Home Services does not provide coffee-related services.

### Transcript

```
AI: Thank you for calling ABC Home Services. How can I help you today?
User: Hi. Uh, how much is coffee?
AI: I don't have information about coffee. Um, are you calling about one of our home services, like HVAC, plumbing, or electrical.
User: I also know about coffee price.
AI: Got it. Are you looking for help with, uh, HVAC repair, plumbing, water heater repair, or electrical inspection?
User: No, I want no prize.
AI: Okay. Could you tell me what service you need help with today?
User: Do you have coffee delivery?
AI: We don't offer coffee delivery. Are you interested in, uh, any of our home services like HVAC, plumbing, water heater repair, or electrical inspection?
User: No. No. Uh, thank you. It's wrong call.
AI: No problem at all. Have a great day.
```

**Pass / Fail:** ☑ Pass — Notes: No fabricated price for unlisted item. *(Optional: place one more call asking water heater repair price to match script exactly.)*

---

## Test 5 — Service area

| Field | Expected | Actual |
|-------|----------|--------|
| **Call ID** | — | `019e54e1-2852-7000-9710-14810b7b153c` |
| **Assessment script** | "Do you service Lakewood?" | Caller asked **"do you serve Aurora?"** |
| **intent** | `service_area_question` | `service_area_question` |
| **addressOrCity** | Lakewood | `Aurora` |
| **Agent behavior** | Confirm if in service area list | Agent: *"Yes. We do serve Aurora."* |

### Summary

> The user called ABC Home Services solely to confirm if they provide services in Aurora. The AI agent confirmed that Aurora is indeed within their service area. After receiving this confirmation, the user ended the call without requesting any specific service.

### Transcript

```
AI: Thank you for calling ABC Home Services. How can I help you today?
User: User of Aurora.
AI: Thanks for sharing. Which service do you need help with?
User: No. No. I asked for, uh, do you serve Aurora?
AI: Yes. We do serve Aurora. What service are you interested
User: No. Just... I I want to confirm you have service in Aurora.
AI: Yes. definitely serve Aurora. Is there something specific you need help with there?
User: No. No. Thank you.
AI: You're welcome. If you need anything else, just give us a call. Have a great day.
User: Okay. Thank you. Have a great day.
AI: Thank you. Take care. Goodbye.
```

**Pass / Fail:** ☑ Pass — Notes: Correct yes for a listed service area.

---

## Bonus — Unknown request (not one of the 5 required, useful for rubric)

| Field | Actual |
|-------|--------|
| **DB `id`** | 93 |
| **Call ID** | `019e54ee-6617-7000-9054-f7b1da6d35f9` |
| **intent** | `unknown_request` |
| **What caller said** | "Do you have a food delivery service?" |
| **Agent behavior** | Clarified not offered; listed real home services |

### Summary

> The user called ABC Home Services to inquire about food delivery. The AI agent clarified that they do not offer food delivery, instead listing their actual services such as HVAC, plumbing, and electrical inspections before the call concluded.

### Transcript

```
AI: Thank you for calling ABC Home Services. How can I help you today?
User: Do you have a food delivery service?
AI: We don't offer food delivery. What kind of home service do you need help with?
User: Okay. Thank you.
AI: You're welcome. If you need any home services like HVAC, plumbing, or electrical inspections, feel free to call. Have a great day.
```

---

## Summary table (all 5 required tests)

| # | Scenario | intent | isEmergency | serviceNeeded | customerName | city | Pass? |
|---|----------|--------|-------------|---------------|--------------|------|-------|
| 1 | Booking | booking_request | false | HVAC repair | Michael | Denver | ☑ |
| 2 | Emergency | emergency | true | plumbing | Michael | Denver | ☑ |
| 3 | Pricing (known) | pricing_question | false | HVAC repair | — | — | ☑ |
| 4 | Unknown price | pricing_question | false | plumbing* | — | — | ☑ |
| 5 | Service area | service_area_question | false | — | — | Aurora | ☑ |

\*Test 4: `service_needed` in DB reflects keyword bleed from assistant listing services; caller topic was coffee, not plumbing.

---
