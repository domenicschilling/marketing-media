#!/usr/bin/env python3
"""Contract Isto Tattoo (Michalis Stefanidis) – English, 16.11.2026.
Basis: Chic contract (content/kunden/chic-tattoo-augsburg/vertrag-2026-11-15/build.py) + building block "cancel monthly".
Terms (Domenic 16.11.2026): month 1 €499 net, from month 2 €699 net/month, cancel monthly, + €149 net/month WhatsApp chatbot,
all prices net, start when the campaign goes live, contract in English.
Run: pw-python build.py -> Isto-Tattoo-Contract-TattooLeadz.pdf"""
import base64, glob
from pathlib import Path
from playwright.sync_api import sync_playwright

HIER = Path(__file__).resolve().parent
logo = sorted(glob.glob(str(HIER / "img/*")))[0]
LOGO = f"data:image/{Path(logo).suffix[1:].replace('jpg','jpeg')};base64," + base64.b64encode(Path(logo).read_bytes()).decode()

AG_NAME = "TattooLeadz.de"
AG = "TattooLeadz.de, owner Andy Neelsen, Landshuter Allee 42, 80637 Munich, Germany"
KUNDE = "Isto Tattoo, Michalis Stefanidis, Kirchheimer Str. 20, 73240 Wendlingen am Neckar-Unterboihingen, Germany"
FASSUNG = "Version of 16 November 2026 · Client: Isto Tattoo, Michalis Stefanidis, Wendlingen am Neckar"
MAIL_KUNDE = "istotattoo@gmail.com"

# All figures in ONE place (all prices agreed as NET, plus 19 % German VAT)
M1 = ("€499.00", "€94.81", "€593.81")        # month 1 (test month)
M2 = ("€699.00", "€132.81", "€831.81")       # from month 2, per month
BOT = ("€149.00", "€28.31", "€177.31")       # WhatsApp chatbot, per month
M1_BOT = ("€648.00", "€123.12", "€771.12")   # month 1 incl. chatbot
M2_BOT = ("€848.00", "€161.12", "€1,009.12") # from month 2 incl. chatbot
BUDGET = "approx. €25 per day"


def kopf(titel, unter, neu=True):
    return f'<section class="{"neu" if neu else ""}"><img class="logo" src="{LOGO}"><h1>{titel}</h1><p class="unter">{unter}</p><p class="fassung">{FASSUNG}</p>'


def unterschrift(l1, l2, r1, r2):
    return f'''<table class="sig"><tr><td>Place, date: {l1}, ______________</td><td>Place, date: {r1}, ______________</td></tr>
<tr><td class="linie">____________________________________</td><td class="linie">____________________________________</td></tr>
<tr><td>{l2}</td><td>{r2}</td></tr></table>'''


def zeilen(rows):
    return "".join(f"<tr><td>{a}</td><td>{b}</td></tr>" for a, b in rows)


def preis(t):
    return f"{t[0]} net plus 19 % VAT ({t[1]}) = {t[2]} gross"


VERTRAG = kopf("Advertising Services Agreement", "Lead campaigns for large-scale tattoo projects · no minimum term", neu=False) + f'''
<p>between</p>
<p><b>TattooLeadz.de</b>, owner Andy Neelsen, Landshuter Allee 42, 80637 Munich, Germany, VAT ID DE348150427<br>– hereinafter the “Agency” –</p>
<p>and</p>
<p><b>Isto Tattoo</b>, Michalis Stefanidis, Kirchheimer Str. 20, 73240 Wendlingen am Neckar-Unterboihingen, Germany, e‑mail: {MAIL_KUNDE}<br>– hereinafter the “Client” –</p>

<h2>§ 1 Subject of the Agreement</h2>
<p>(1) The Agency plans, creates and manages advertising campaigns for the Client on the Meta platforms (Facebook and Instagram) with the aim of generating enquiries from potential clients for large-scale tattoo projects (“Leads”). The Agency builds a dedicated enquiry page for the Client and delivers every Lead instantly to a Google Sheets list that the Client and his team can access.</p>
<p>(2) The scope of services is set out in § 2 and in <b>Annex 1 (Service Description and Prices)</b>. In addition, the <b>Agency’s General Terms and Conditions (Annex 2)</b> and the <b>Data Processing Agreement (Annex 3)</b> apply. In case of conflict, this Agreement prevails over Annex 1, and Annex 1 over Annex 2; on data protection, Annex 3 prevails over all other provisions.</p>
<p>(3) The Agency owes professional services (service contract within the meaning of §§ 611 et seq. of the German Civil Code, BGB), but not a specific result, in particular not a specific number of Leads, bookings or revenue.</p>
<p>(4) The Client enters into this Agreement as a business (entrepreneur within the meaning of § 14 BGB).</p>

<h2>§ 2 Services and Prices</h2>
<p>All prices in this Agreement are <b>net prices</b> plus the statutory German VAT (currently 19 %).</p>
<table class="t"><tr><th>Item</th><th>Price</th></tr>{zeilen([
("<b>Month 1</b> (test month): enquiry page, ad creatives, campaign set-up and management, Google Sheets list", preis(M1)),
("<b>From month 2</b>, per month: management, new ad creatives, weekly report", preis(M2)),
("Set-up fee", "none – set-up is included in month 1"),
])}</table>
<p class="box"><b>Optional: WhatsApp chatbot</b> – {BOT[0]} net per month plus 19 % VAT ({BOT[1]}) = {BOT[2]} gross, billed together with the monthly fee. The chatbot replies to new enquiries instantly via WhatsApp, also at night, pre-qualifies them and prepares the free consultation (details in Annex 1).<br>
☐ &nbsp;<b>booked</b> (month 1 then {M1_BOT[0]} net, from month 2 {M2_BOT[0]} net per month) &nbsp;&nbsp; ☐ &nbsp;<b>not booked</b><br>
<span class="klein">The chatbot can also be added later or terminated separately with the same notice as in § 5.</span></p>

<h2>§ 3 Advertising Budget and Ad Account</h2>
<p>(1) The advertising budget is not included in the prices in § 2. The Client pays it himself directly to Meta via his own ad account; the Agency does not invoice it. Recommended daily budget: <b>{BUDGET}</b> (approx. €750 per month). The Client decides on the budget; changes are agreed in text form (e.g. WhatsApp, e‑mail). Meta may spend slightly more or less on individual days and balances this out over the week.</p>
<p>(2) The Client grants the Agency access to his Meta Business account or ad account (partner access) and stores a valid means of payment there. The ad account, pages and all data in them remain with the Client. After the end of the Agreement, the Client revokes the Agency’s access or the Agency returns it.</p>

<h2>§ 4 Invoicing and Payment</h2>
<p>(1) The invoice for month 1 is issued as soon as the preparation is complete (enquiry page, ads and campaign ready to start and approved by the Client); the campaign goes live once this invoice has been paid. All further months are invoiced monthly in advance at the start of each contract month (§ 5 (1)). Invoices are payable within 7 days of the invoice date without deduction, by bank transfer to Kreissparkasse München Starnberg Ebersberg, IBAN DE71 7025 0150 0023 6476 62, BIC BYLADEM1KMS. Invoices are sent by e‑mail to {MAIL_KUNDE}.</p>
<p>(2) If the Client is in default of payment, the Agency may, after an unsuccessful payment reminder with a 7-day deadline, pause the campaigns until payment is received. The obligation to pay remains. Statutory default interest (§ 288 (2) BGB) and the flat-rate default fee of €40 (§ 288 (5) BGB) remain reserved.</p>

<h2>§ 5 Start, Term and Termination</h2>
<p>(1) The Agreement takes effect when signed by both parties (also as a scan, photo or electronic signature). The Agency then starts the preparation. <b>The term starts on the day the first ad goes live (campaign start).</b> Contract months run from the campaign start (e.g. campaign start on 3 December → month 1 runs until 2 January, month 2 starts on 3 January). The month-1 fee paid before the start covers the first contract month from the campaign start.</p>
<p>(2) Sequence: signing → preparation (videos filmed by the Client, enquiry page, ads, access to the ad account) → approval by the Client → invoice for month 1 → campaign start after payment. The Agency launches the campaign no later than 2 working days after receipt of payment.</p>
<p>(3) There is <b>no minimum term</b>. The Agreement runs for an indefinite period and can be terminated (gekündigt) by either party at any time with effect from the end of the current contract month. Before the campaign start, termination takes effect on receipt; no fees are owed for the preparation. In the case of ordinary termination, fees already invoiced are not refunded pro rata; in the case of termination for good cause (wichtiger Grund), § 628 BGB remains unaffected.</p>
<p>(4) The right to terminate for good cause (wichtiger Grund) remains unaffected. Every termination must be made in text form (Textform, § 126b BGB), e.g. by e‑mail to info@tattooleadz.de or to {MAIL_KUNDE}.</p>

<h2>§ 6 Client’s Cooperation</h2>
<ul><li>The Client films the short videos for the ads himself, based on the script templates provided by the Agency (one version with €300 off, one with 25 % off), and provides further content (photos, texts, available days in Stuttgart) promptly. He approves the enquiry page, the ads and the advertised offer in text form.</li>
<li>The Client sets up partner access to his Meta ad account and stores a valid means of payment there.</li>
<li>The Client names the person and WhatsApp number that will contact the Leads, and keeps the Agency informed about available days and planned guest spots, so that only days that are actually available are advertised.</li>
<li>The Client or his team contacts new Leads promptly, if possible on the same day, and keeps the status in the Google Sheets list up to date. Results depend significantly on fast contact.</li>
<li>If the chatbot is booked: the Client approves the WhatsApp number to be used for the WhatsApp Business Platform (approval in the Client’s Meta Business account or confirmation by code). If this is not possible at the start, the chatbot writes via a number of the Agency on behalf of Isto Tattoo.</li></ul>

<h2>§ 7 Content and Rights</h2>
<p>(1) The Client warrants that he holds all rights necessary for the content he provides, in particular the consent of the persons shown (clients, models) to its use in advertising. He indemnifies the Agency against third-party claims based on a culpable breach of this warranty by the Client, including reasonable legal defence costs.</p>
<p>(2) The Client grants the Agency the simple right of use (einfaches Nutzungsrecht), limited to the term of the Agreement, to edit and publish the content for the campaigns.</p>
<p>(3) After full payment, the Client receives a simple right of use (einfaches Nutzungsrecht), unlimited in time and territory, to the ads created by the Agency for his own advertising, including their texts and the videos filmed by the Client on the basis of the Agency’s scripts. The Agency retains all rights in templates, campaign concepts, the enquiry page, automations, chatbot instructions and message texts.</p>
<p>(4) The Agency may name the Client as a reference with name and logo: ☐ yes &nbsp; ☐ no. The Agency may in any case use anonymised figures without the studio name (e.g. cost per enquiry) for its own advertising.</p>

<h2>§ 8 Data Protection and Advertising Law</h2>
<p>(1) Insofar as the Agency processes personal data of Leads on behalf of the Client, the Data Processing Agreement (Annex 3) applies. The Client is the controller towards the Leads within the meaning of the GDPR.</p>
<p>(2) The enquiry page states directly above the submit button that the Client will contact the enquirer about the enquiry via WhatsApp or phone, and links to the privacy policy and imprint. The Agency provides drafts of the imprint and privacy policy; the Client provides the details for them and checks them. Tracking on the enquiry page (e.g. Meta Pixel) is only activated with the visitor’s consent. If the chatbot is booked, it identifies itself as an AI assistant.</p>
<p>(3) The Client is responsible for the content and lawfulness of advertised offers, discounts, prices and dates. In particular, only what the Client actually honours may be advertised. The Agency checks wording drafted by it for obvious breaches of advertising law; the Client decides on the amount of discounts, conditions and availability with his approval.</p>

<h2>§ 9 Liability</h2>
<p>(1) The Agency has unlimited liability for intent and gross negligence, for injury to life, body or health, under the German Product Liability Act and insofar as it has given a guarantee.</p>
<p>(2) In the event of a slightly negligent breach of an essential contractual obligation (an obligation whose fulfilment makes the proper performance of the Agreement possible in the first place and on whose fulfilment the Client may regularly rely), liability is limited to the foreseeable damage typical for this type of contract at the time of conclusion, but no more than €5,000 per case of damage. Otherwise, liability for slight negligence is excluded.</p>
<p>(3) The Agency is not liable for outages, blocks, rejections of ads or message templates, policy changes or billing errors of third-party platforms (in particular Meta, WhatsApp, Superchat, Google), unless it is responsible for them.</p>

<h2>§ 10 Confidentiality</h2>
<p>Both parties treat all non-public information of the other party (in particular prices, campaign results, client data) as confidential, also after the end of the Agreement.</p>

<h2>§ 11 Final Provisions</h2>
<p>(1) Individual agreements take precedence. Amendments and additions must be made at least in text form.</p>
<p>(2) If a provision is invalid, the rest of the Agreement remains valid. German law applies, excluding the UN Convention on Contracts for the International Sale of Goods. The place of jurisdiction is Munich, insofar as the Client is a merchant (Kaufmann), a legal entity under public law or a special fund under public law.</p>
<p>(3) This Agreement is concluded in English. Where German legal terms are given in brackets, they define the meaning of the English term.</p>

<div class="ende"><h2>Individual Agreements</h2>
<p>Month 1 {M1[0]} net, from month 2 {M2[0]} net per month, WhatsApp chatbot optionally {BOT[0]} net per month (see § 2), all prices net plus 19 % VAT, no set-up fee, payment by bank transfer on invoice; the invoice for month 1 is issued when the preparation is complete, the campaign goes live after payment. The term starts on the day the campaign goes live; no minimum term, termination at any time with effect from the end of the current contract month (§ 5). Advertising budget recommended {BUDGET}, paid by the Client directly to Meta (§ 3). First offer to be advertised, subject to the Client’s approval in text form: discount on the first full-day session of a new large-scale project (new large-scale projects only, one per person, first full-day session to take place by 28 February 2027, appointments subject to availability; each enquirer receives the discount shown in the ad he responded to), tested as two variants, €300 off versus 25 % off; afterwards only the better-performing variant continues. Invoices by e‑mail to {MAIL_KUNDE}. No further individual agreements.</p>
<p class="klein">Annexes: Annex 1 Service Description and Prices · Annex 2 General Terms and Conditions · Annex 3 Data Processing Agreement</p>
{unterschrift("Munich", "TattooLeadz.de – Andy Neelsen", "Wendlingen am Neckar", "Isto Tattoo – Michalis Stefanidis")}</div>
</section>'''

ANLAGE1 = kopf("Annex 1: Service Description and Prices", "to the Advertising Services Agreement") + f'''
<h2>1. Overview</h2>
<table class="t"><tr><th>Service</th><th>Isto Tattoo</th></tr>{zeilen([
("Start", "on the day the first ad goes live; invoice for month 1 when the preparation is complete, campaign start after payment"),
("Month 1 (test month)", preis(M1)),
("From month 2", preis(M2) + " per month"),
("Set-up fee", "none (included in month 1)"),
("Term", "no minimum term, can be terminated monthly with effect from the end of the current contract month"),
("WhatsApp chatbot (optional)", preis(BOT) + " per month"),
("Ad account", "the Client’s own account"),
("Advertising budget (paid by the Client)", f"directly to Meta, recommended {BUDGET}"),
("Meta ads on Instagram and Facebook", "✓ set-up and ongoing management"),
("Dedicated enquiry page", "✓ dark lookbook with only the Client’s work, sorted by body part; ads and page in the same look"),
("Leads in Google Sheets", "✓ every enquiry lands instantly in the Client’s Google Sheets list; the Client’s WhatsApp team takes over contact"),
("Targeting", "people who already know Isto Tattoo, approx. 150 km around Stuttgart, Germany/Austria/Switzerland, and the city of announced guest spots ahead of time"),
("Report", "weekly: ad spend, enquiries, cost per enquiry, status from the Google Sheets list"),
("Contact", "WhatsApp group"),
])}</table>
<h2>2. Month 1 (included in the price for month 1)</h2>
<ul><li>Agreement on offer, prices, available days and target areas</li>
<li>Set-up or review of ad account, pixel/dataset and campaign</li>
<li>Enquiry page with the Client’s own photos and videos (no AI images), in German for German-speaking clients</li>
<li>Script templates for two short videos that the Client films himself (€300 version and 25 % version); editing of these videos and further ad creatives from the Client’s real work</li>
<li>Connection of the enquiry page to the Google Sheets list</li>
<li>Campaign launch and management, test of two offer variants (§ “Individual Agreements”)</li></ul>
<h2>3. From month 2</h2>
<ul><li>Campaign checks at least twice a week, optimisation of budget allocation, audiences and ads</li>
<li>New ad creatives from material provided by the Client</li>
<li>Weekly report</li>
<li>Support via the shared WhatsApp group on working days from 9 am to 6 pm</li></ul>
<h2>4. WhatsApp chatbot (optional, {BOT[0]} net per month)</h2>
<ul><li>Writes to every new enquiry instantly via WhatsApp, also at night and at weekends, and identifies itself as an AI assistant</li>
<li>Pre-qualifies: only large-scale projects (sleeves, back, chest/front, legs) in Isto’s style; politely declines small motifs</li>
<li>Prepares the free consultation: by default in the studio in Stuttgart, by video call for clients from further away; asks whether the client speaks English, otherwise notes that an appointment with an interpreter is needed; asks when the client is available</li>
<li>Never confirms appointments or prices on its own – the Client’s team always confirms</li>
<li>The Client’s team can take over any chat at any time</li>
<li>Meta’s WhatsApp message fees are not included in the chatbot price; they are borne by the Client (charged by Meta directly or passed on by the Agency at cost)</li></ul>
<h2>5. Not included</h2>
<ul><li>Advertising budget at Meta (paid by the Client directly to Meta)</li>
<li>Appointment scheduling, price agreements and deposits with the clients (done by the Client’s team)</li>
<li>Video shoots on site, maintenance of website, Google profile or Instagram account</li>
<li>Translation services for consultations or sessions</li></ul></section>'''

ANLAGE2 = kopf("General Terms and Conditions", "TattooLeadz.de · for businesses (B2B)") + '''
<h2>§ 1 Scope</h2>
<p>(1) These terms apply to all contracts between TattooLeadz.de, owner Andy Neelsen, Landshuter Allee 42, 80637 Munich, Germany (“Agency”) and its clients for online marketing services, in particular advertising campaigns on Meta platforms, collection and forwarding of enquiries (Leads) and automated messages.</p>
<p>(2) The Agency only concludes contracts with businesses within the meaning of § 14 BGB. Deviating terms of the client only apply if the Agency expressly agrees to them in text form.</p>
<h2>§ 2 Conclusion of Contract</h2>
<p>Offers by the Agency are non-binding. The contract is concluded by signing the contract (also electronically) or by accepting an offer in text form.</p>
<h2>§ 3 Services</h2>
<p>(1) The scope and content of the services result from the contract and the service description. The Agency provides services; a specific economic result (number of Leads, bookings, revenue) is not owed unless a guarantee has been expressly agreed.</p>
<p>(2) The Agency may use subcontractors and software services (e.g. Meta, Google, Make, Superchat, Netlify, Supabase, Anthropic). The Data Processing Agreement applies to the processing of personal data.</p>
<p>(3) Advertising platforms decide themselves on approval, delivery and costs of ads. Rejections or blocks by the platform are not a breach of duty by the Agency, unless the Agency is responsible for them. The Agency supports the client in resolving them.</p>
<h2>§ 4 Duty to Cooperate</h2>
<p>The client provides content, access and information in good time and in full, reviews ads and texts presented to him promptly and handles incoming Leads promptly. If the client does not cooperate, the Agency’s deadlines are postponed accordingly; the Agency’s claims under § 615 BGB remain unaffected.</p>
<h2>§ 5 Approvals</h2>
<p>Ads, message texts and advertised offers only go live after approval by the client in text form (e.g. WhatsApp).</p>
<h2>§ 6 Prices and Payment</h2>
<p>(1) The prices agreed in the contract apply. Advertising budgets at platforms are borne by the client. Invoices are due within 7 days without deduction.</p>
<p>(2) In case of default of payment, the Agency may withhold its services until payment is received after a reminder with a 7-day deadline. The client may only set off claims that are undisputed or have been finally established by a court.</p>
<p>(3) For contracts of indefinite duration, the Agency may adjust the fees with 2 months’ notice with effect from the start of a contract month. The client may terminate the contract with effect from the date the change takes effect.</p>
<h2>§ 7 Rights of Use</h2>
<p>After full payment, the client receives a simple right of use, unlimited in time, to the ads created for him (including their texts) for his own advertising. Other concepts, templates, automations, technical processes, scripts and texts of the Agency may not be passed on to third parties or used after the end of the contract without consent.</p>
<h2>§ 8 Third-Party Rights and Advertising Law</h2>
<p>The client is responsible for ensuring that advertised offers, prices, discounts and promotions are lawful and honoured, and that he holds the rights to the content he provides (copyright, trademark and personality rights, in particular consents of persons shown). He indemnifies the Agency against third-party claims based on a culpable breach of these obligations by the client, including reasonable legal defence costs. This does not apply insofar as the Agency itself is responsible for the infringement, in particular through ad or page texts written by it.</p>
<h2>§ 9 Liability</h2>
<p>(1) The Agency has unlimited liability for intent, gross negligence, injury to life, body or health, under the Product Liability Act and to the extent of a guarantee given.</p>
<p>(2) In the event of a slightly negligent breach of essential contractual obligations, the Agency’s liability is limited to the foreseeable damage typical for this type of contract at the time of conclusion, but no more than €5,000 per case of damage. Otherwise, liability for slight negligence is excluded. Claims become time-barred one year after knowledge, except in the cases of paragraph 1.</p>
<h2>§ 10 Term, Termination, End of Contract</h2>
<p>(1) Term and notice periods result from the contract. Terminations (Kündigungen) must be made in text form (Textform).</p>
<p>(2) After the end of the contract, the Agency stops all campaigns, automations and data forwarding, returns access and, on request, hands over to the client a list of the Leads from the term of the contract. It then deletes the Lead data in accordance with the Data Processing Agreement.</p>
<h2>§ 11 References</h2>
<p>The Agency may only name the client as a reference with his consent. It may use anonymised figures (e.g. cost per Lead without the studio name) for its own advertising.</p>
<h2>§ 12 Final Provisions</h2>
<p>German law applies, excluding the UN Convention on Contracts for the International Sale of Goods. The place of jurisdiction is Munich, insofar as the client is a merchant. If a provision is invalid, the remaining provisions remain valid.</p></section>'''

AVV = kopf("Data Processing Agreement", "Annex 3 to the Advertising Services Agreement · pursuant to Art. 28 GDPR") + f'''
<p>between the Client ({KUNDE}) as controller and {AG} as processor (Art. 28 GDPR).</p>
<h2>§ 1 Subject and Duration</h2>
<p>The Agency processes personal data of prospective clients who submit enquiries via advertising campaigns on behalf of the Client. The processing lasts as long as the Advertising Services Agreement; § 7 applies thereafter.</p>
<h2>§ 2 Nature, Purpose and Data Subjects</h2>
<table class="t"><tr><th>Item</th><th>Description</th></tr>{zeilen([
("Purpose", "Collection and forwarding of enquiries for large-scale tattoo projects; if the chatbot is booked, automated first contact, pre-qualification and preparation of the consultation via WhatsApp"),
("Types of data", "First name, mobile number, details of the tattoo project (body part, size, idea, desired start), place of residence or region and language (if asked by the chatbot), availability for the consultation, time of the enquiry, page visited and campaign identifier (UTM parameters), technical access data at the host (IP address, time, browser), chat histories with the chatbot and the Client’s team, photos and files that enquirers send in the chat; any further details the enquirer provides in the chat"),
("Special categories", "Not intentionally. If an enquirer sends photos of scars or mentions health information, these are only used to assess the project, not for analyses or ad audiences, and are not passed on to Meta’s advertising systems. The chatbot does not ask about illnesses or allergies and hands the chat over to the Client’s team if such information is mentioned. The Client is responsible for the legal basis (§ 6)."),
("Data subjects", "Prospective clients and clients of Isto Tattoo"),
("Processing operations", "Collection via the enquiry page, storage in Google Sheets, transmission to the WhatsApp inbox, sending of WhatsApp templates and replies by the chatbot (AI) if booked, anonymised evaluation for campaign optimisation, deletion"),
])}</table>
<h2>§ 3 Instructions</h2>
<p>The Agency processes the data only on documented instructions from the Client; the main agreement and this agreement constitute these instructions. This also applies to transfers to third countries; the transfers listed in § 5 are hereby instructed. If the Agency is legally obliged to process data differently, it informs the Client in advance, unless the law prohibits this. Further instructions are given by the Client in text form. If the Agency considers an instruction to be unlawful, it informs the Client.</p>
<h2>§ 4 Obligations of the Agency</h2>
<ul><li>Confidentiality: all persons with access are bound to confidentiality.</li>
<li>Technical and organisational measures pursuant to Art. 32 GDPR (see Appendix 1).</li>
<li>Support of the Client with all data subject rights under Chapter III GDPR (access, rectification, erasure, restriction, data portability, objection); the Agency forwards requests from data subjects to the Client without delay.</li>
<li>Notification of personal data breaches to the Client without undue delay, at the latest within 24 hours of becoming aware, with the information the Client needs for notifications under Art. 33 and 34 GDPR.</li>
<li>Support with data protection impact assessments and any prior consultation of the supervisory authority (Art. 35, 36 GDPR), where necessary.</li>
<li>Proof of compliance with this agreement on request; the Agency allows for and contributes to audits and inspections by the Client or an auditor appointed by him, with reasonable advance notice.</li></ul>
<h2>§ 5 Sub-processors</h2>
<p>The Client consents to the use of the following sub-processors. For the WhatsApp inbox, the Agency uses either Superchat or its own inbox “TattooLeadz Chat”; the Client consents to both. The Agency contractually obliges every sub-processor to data protection obligations corresponding to this agreement, in particular to appropriate technical and organisational measures (Art. 28 (4) GDPR). If a sub-processor fails to fulfil its obligations, the Agency is liable to the Client as for its own actions. The Agency informs the Client 14 days in advance about new or replaced sub-processors; the Client may object for an important data protection reason. If he objects, the Agency does not use the new sub-processor for him; if this is not possible, either party may terminate the main agreement with effect from the date of the change.</p>
<table class="t v"><tr><th>Service</th><th>Provider</th><th>Purpose</th><th>Location</th></tr>
<tr><td>Netlify</td><td>Netlify, Inc., San Francisco, USA</td><td>Hosting of the enquiry page (technical access data such as IP address)</td><td>USA (EU-US DPF, SCC)</td></tr>
<tr><td>Make</td><td>Make.com (Celonis group; contracting party according to Make’s data processing agreement)</td><td>Data forwarding form → list / WhatsApp</td><td>EU data zone (eu2); access from the USA possible (SCC, DPF)</td></tr>
<tr><td>Google Sheets</td><td>Google Ireland Ltd., Gordon House, Barrow Street, Dublin 4, Ireland</td><td>Lead list</td><td>EU / USA (Google data processing terms with SCC, EU-US DPF)</td></tr>
<tr><td>Superchat</td><td>SuperX GmbH, Prenzlauer Allee 242–247, 10405 Berlin, Germany</td><td>WhatsApp inbox, automations, chatbot (AI) – only if the chatbot is booked</td><td>EU (hosting); the AI assistant transfers chat content to the AI providers on Superchat’s sub-processor list, partly USA (DPF, SCC); list on request</td></tr>
<tr><td>TattooLeadz Chat – database</td><td>Supabase, Inc., San Francisco, USA</td><td>Storage of chats and contacts in the team inbox (only if used instead of Superchat)</td><td>EU (Frankfurt, eu-central-1); access from the USA possible (DPF, SCC)</td></tr>
<tr><td>TattooLeadz Chat – AI</td><td>Anthropic PBC, San Francisco, USA</td><td>Replies and summaries of the chatbot (only if used instead of Superchat)</td><td>USA (DPF, SCC)</td></tr>
<tr><td>WhatsApp Business Platform</td><td>Meta Platforms Ireland Ltd., Dublin, Ireland</td><td>Sending messages</td><td>EU / USA (DPF, SCC)</td></tr></table>
<p class="klein">Note: Meta and the Client as advertiser are responsible under Meta’s terms for the delivery of ads and for measurements within Facebook and Instagram; this agreement does not apply to that. Tracking on the enquiry page is only activated with the visitor’s consent.</p>
<h2>§ 6 Obligations of the Client</h2>
<p>The Client is responsible for the lawfulness of the processing, in particular for the legal basis (pre-contractual measures or consent), his privacy policy and informing data subjects. The Agency provides text modules for the enquiry page and privacy notice for this purpose.</p>
<h2>§ 7 Deletion and Return</h2>
<p>After the end of the main agreement, the Agency hands over the Lead data to the Client as a spreadsheet on request and then deletes it within 30 days at its end and at the sub-processors, insofar as this data is within its access and there is no statutory retention obligation; messages on the enquirers’ devices are excluded. During the term, the Agency deletes Leads that do not become clients at the latest at the time stated in the privacy policy of the enquiry page, and in any case no later than 12 months after receipt.</p>
<h2>§ 8 Liability and Final Provisions</h2>
<p>Art. 82 GDPR applies to liability; internally, the provisions of the main agreement apply. In case of conflict, this agreement prevails over the data protection provisions of the main agreement.</p>
<h2>Appendix 1: Technical and Organisational Measures (summary)</h2>
<ul><li>Access to Google, Meta, Make, Netlify, Supabase and Superchat accounts only with personal logins and two-factor authentication</li>
<li>Sharing of sheets only with named persons, no “anyone with the link” sharing for Lead lists</li>
<li>Roles and rights: clients only see their own Leads, staff only the clients they look after</li>
<li>Transmission only encrypted (HTTPS); form data is not stored permanently on the enquiry page</li>
<li>Devices with screen lock and disk encryption, current updates</li>
<li>Data minimisation: the form only asks for what is necessary for the enquiry</li>
<li>Record of all persons with access, revocation of access on the day of leaving</li>
<li>Regular deletion routine according to § 7</li></ul>
{unterschrift("Wendlingen am Neckar", "Isto Tattoo – Michalis Stefanidis (controller)", "Munich", "TattooLeadz.de – Andy Neelsen (processor)")}
</section>'''

CSS = """
*{box-sizing:border-box}body{font:10.5pt/1.38 Arial,Helvetica,sans-serif;color:#111;margin:0}
section{position:relative}section.neu{break-before:page}
.logo{position:absolute;right:0;top:-8mm;width:24mm}
h1{font-size:17pt;margin:12mm 0 2mm}h2{font-size:12.5pt;margin:5mm 0 2mm;break-after:avoid}
.unter{color:#555;margin:0 30mm 1mm 0}.fassung{color:#777;font-size:8.5pt;margin:0 0 3mm}
p{margin:0 0 2mm;text-align:left}ul{margin:0 0 2mm;padding-left:5mm}li{margin:0 0 1mm}
.box{padding-left:4mm}.ende{break-inside:avoid}.klein{font-size:9pt;color:#444}
table.t{border-collapse:collapse;width:100%;margin:0 0 3mm;font-size:9.5pt}
table.t th{background:#111;color:#fff;text-align:left;padding:1.4mm 2mm}
table.t td{border:0.3mm solid #bbb;padding:1.4mm 2mm;vertical-align:top}table.t tr{break-inside:avoid}
table.t td:first-child{width:42%}table.v td:first-child{width:18%}table.v td:nth-child(2){width:28%}
table.sig{width:100%;margin-top:9mm;break-inside:avoid;font-size:10pt}table.sig td{width:50%;padding:1mm 3mm 1mm 0;vertical-align:top}.linie{padding-top:11mm!important}
"""
html = f'<!doctype html><html lang="en"><meta charset="utf-8"><title>Advertising Services Agreement Isto Tattoo</title><style>{CSS}</style><body>{VERTRAG}{ANLAGE1}{ANLAGE2}{AVV}</body></html>'
(HIER / "vertrag.html").write_text(html, encoding="utf8")
FOOT = """<div style="width:100%;font:7pt Arial;color:#777;text-align:center;padding:0 14mm">TattooLeadz.de · owner Andy Neelsen · Landshuter Allee 42 · 80637 Munich · Germany · VAT ID DE348150427 · Kreissparkasse München Starnberg Ebersberg · IBAN DE71 7025 0150 0023 6476 62 · BIC BYLADEM1KMS<br>Advertising Services Agreement Isto Tattoo · page <span class="pageNumber"></span> of <span class="totalPages"></span></div>"""
OUT = HIER / "Isto-Tattoo-Contract-TattooLeadz.pdf"
with sync_playwright() as p:
    b = p.chromium.launch(); g = b.new_page()
    g.goto((HIER / "vertrag.html").as_uri()); g.wait_for_timeout(300)
    g.pdf(path=str(OUT), format="A4", print_background=True, display_header_footer=True, header_template="<span></span>", footer_template=FOOT, margin={"top": "18mm", "bottom": "20mm", "left": "20mm", "right": "20mm"})
    b.close()
print("ok", OUT)
