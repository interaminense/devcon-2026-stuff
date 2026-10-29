import json
import os
import sys

ROOT = os.path.expanduser(sys.argv[1])
COLLECTION = os.path.join(ROOT, "src/fragments/swell-lab")

FRAGMENTS = {}


def fragment(key, name, html, css, js=None, icon="square-hole"):
	FRAGMENTS[key] = (name, html.strip() + "\n", css.strip() + "\n", js.strip() + "\n" if js else None, icon)


fragment(
	"sl-header",
	"Swell Lab Header",
	"""
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@500;600;700&display=swap" rel="stylesheet" />

<header class="sl-header">
	<div class="sl-container sl-header__inner">
		<a class="sl-header__brand" href="/home">
			<img alt="Swell Lab" class="sl-header__logo" data-lfr-editable-id="logo" data-lfr-editable-type="image" src="[resources:logo.svg]" />
		</a>

		<nav class="sl-header__nav">
			<a href="/lessons">Lessons</a>
			<a href="/trips">Trips</a>
			<a href="/spots">Spots</a>
			<a href="/learn">Learn</a>
			<a href="/blog">Blog</a>
			<a class="sl-header__signed-in" hidden href="/dashboard">Dashboard</a>
		</nav>

		<div class="sl-header__actions">
			<a class="sl-header__account sl-header__signed-out" href="/c/portal/login">Sign in</a>
			<a class="sl-header__account sl-header__signed-in" hidden href="/c/portal/logout">Sign out</a>

			<a class="sl-button sl-button--accent" data-lfr-editable-id="cta" data-lfr-editable-type="link" href="/book">Book a lesson</a>
		</div>
	</div>
</header>
""",
	"""
:root {
	--sl-accent: #20c9c3;
	--sl-accent-dark: #17a8a3;
	--sl-ink: #1d2b36;
	--sl-muted: #5b6b77;
	--sl-primary: #0b4f6c;
	--sl-sand: #f7f3ea;
	--sl-white: #ffffff;
}

body {
	background-color: var(--sl-sand);
	color: var(--sl-ink);
	font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif;
}

body h1,
body h2,
body h3,
body h4,
.sl-heading {
	color: var(--sl-primary);
	font-family: Poppins, Inter, system-ui, sans-serif;
	font-weight: 700;
	letter-spacing: -0.01em;
}

.sl-container {
	margin: 0 auto;
	max-width: 1180px;
	padding: 0 24px;
}

.sl-button {
	border-radius: 999px;
	display: inline-block;
	font-weight: 600;
	padding: 12px 26px;
	text-decoration: none;
	transition: background-color 0.15s ease, transform 0.15s ease;
}

.sl-button:hover {
	text-decoration: none;
	transform: translateY(-1px);
}

.sl-button--accent {
	background-color: var(--sl-accent);
	color: var(--sl-primary);
}

.sl-button--accent:hover {
	background-color: var(--sl-accent-dark);
	color: var(--sl-white);
}

.sl-button--ghost {
	border: 2px solid currentColor;
	color: var(--sl-white);
}

.sl-button--ghost:hover {
	background-color: rgba(255, 255, 255, 0.15);
	color: var(--sl-white);
}

.sl-section {
	padding: 72px 0;
}

.sl-section__eyebrow {
	color: var(--sl-accent-dark);
	font-size: 13px;
	font-weight: 600;
	letter-spacing: 0.12em;
	margin-bottom: 8px;
	text-transform: uppercase;
}

.sl-section__title {
	font-size: 36px;
	margin-bottom: 12px;
}

.sl-section__lead {
	color: var(--sl-muted);
	font-size: 18px;
	margin-bottom: 40px;
	max-width: 640px;
}

.sl-grid {
	display: grid;
	gap: 24px;
	grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.sl-card {
	background-color: var(--sl-white);
	border-radius: 20px;
	box-shadow: 0 10px 30px rgba(11, 79, 108, 0.08);
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.sl-card__image {
	aspect-ratio: 4 / 3;
	display: block;
	object-fit: cover;
	width: 100%;
}

.sl-card__body {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: 8px;
	padding: 22px 24px 26px;
}

.sl-card__title {
	font-size: 22px;
	margin: 0;
}

.sl-card__text {
	color: var(--sl-muted);
	margin: 0;
}

.sl-tag {
	align-self: flex-start;
	background-color: rgba(32, 201, 195, 0.15);
	border-radius: 999px;
	color: var(--sl-primary);
	font-size: 12px;
	font-weight: 600;
	padding: 4px 12px;
}

.sl-header {
	background-color: var(--sl-white);
	box-shadow: 0 1px 0 rgba(11, 79, 108, 0.08);
	position: sticky;
	top: 0;
	z-index: 10;
}

.sl-header__inner {
	align-items: center;
	display: flex;
	flex-wrap: wrap;
	gap: 16px 32px;
	min-height: 76px;
}

.sl-header__logo {
	display: block;
	height: 40px;
	width: auto;
}

.sl-header__nav {
	display: flex;
	flex: 1;
	gap: 28px;
}

.sl-header__nav a {
	color: var(--sl-ink);
	font-weight: 500;
	text-decoration: none;
}

.sl-header__nav a:hover {
	color: var(--sl-accent-dark);
}

.sl-header__actions {
	align-items: center;
	display: flex;
	gap: 20px;
}

.sl-header__account {
	color: var(--sl-primary);
	font-weight: 600;
	text-decoration: none;
}

.sl-header__account:hover {
	color: var(--sl-accent-dark);
	text-decoration: none;
}

.sl-header [hidden] {
	display: none !important;
}

@media (max-width: 640px) {
	.sl-header__inner {
		gap: 12px 16px;
		justify-content: space-between;
		padding-bottom: 12px;
		padding-top: 12px;
	}

	.sl-header__logo {
		height: 32px;
	}

	.sl-header__nav {
		flex-basis: 100%;
		order: 3;
	}

	.sl-header .sl-button {
		padding: 10px 18px;
	}

	.sl-header__actions {
		gap: 14px;
	}
}
""",
	"""
const signedIn = themeDisplay.isSignedIn();

fragmentElement.querySelectorAll('.sl-header__signed-in').forEach((element) => {
	element.hidden = !signedIn;
});

fragmentElement.querySelectorAll('.sl-header__signed-out').forEach((element) => {
	element.hidden = signedIn;
});

const signIn = fragmentElement.querySelector('.sl-header__signed-out');

if (signIn && !signedIn && !location.pathname.includes('sign-in')) {
	signIn.href = '/c/portal/login?redirect=' + encodeURIComponent(location.pathname + location.search);
}
""",
	icon="nav",
)

fragment(
	"sl-footer",
	"Swell Lab Footer",
	"""
<footer class="sl-footer">
	<div class="sl-container sl-footer__inner">
		<div>
			<div class="sl-footer__brand">SWELL LAB</div>
			<p class="sl-footer__text" data-lfr-editable-id="about" data-lfr-editable-type="text">Surf school and surf trips since 2014. Small groups, certified coaches, and the best waves of the season.</p>
		</div>

		<div>
			<div class="sl-footer__heading">Visit</div>
			<p class="sl-footer__text" data-lfr-editable-id="address" data-lfr-editable-type="rich-text">Praia do Rosa, Santa Catarina<br />Open every day, 7 AM to 6 PM</p>
		</div>

		<div>
			<div class="sl-footer__heading">Talk to us</div>
			<p class="sl-footer__text" data-lfr-editable-id="contact" data-lfr-editable-type="rich-text">hello@swelllab.example<br />+55 48 0000-0000</p>
		</div>

		<div>
			<div class="sl-footer__heading">Follow</div>
			<p class="sl-footer__text">Instagram &middot; YouTube &middot; Strava</p>
		</div>
	</div>

	<div class="sl-container sl-footer__legal">&copy; 2026 Swell Lab. A fictional surf school built for DEVCON 2026.</div>
</footer>
""",
	"""
.sl-footer {
	background-color: var(--sl-primary, #0b4f6c);
	color: rgba(255, 255, 255, 0.8);
	padding: 56px 0 24px;
}

.sl-footer__inner {
	display: grid;
	gap: 32px;
	grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.sl-footer__brand {
	color: #ffffff;
	font-family: Poppins, Inter, sans-serif;
	font-size: 22px;
	font-weight: 700;
	letter-spacing: 0.08em;
	margin-bottom: 8px;
}

.sl-footer__heading {
	color: var(--sl-accent, #20c9c3);
	font-size: 13px;
	font-weight: 600;
	letter-spacing: 0.12em;
	margin-bottom: 8px;
	text-transform: uppercase;
}

.sl-footer__text {
	margin: 0;
}

.sl-footer__legal {
	border-top: 1px solid rgba(255, 255, 255, 0.15);
	font-size: 13px;
	margin-top: 40px;
	padding-top: 20px;
}
""",
	icon="square-hole-multi",
)

fragment(
	"sl-hero",
	"Swell Lab Hero",
	"""
<section class="sl-hero">
	<img alt="Surfer riding a wave" class="sl-hero__image" data-lfr-editable-id="image" data-lfr-editable-type="image" src="[resources:hero-barrel.jpg]" />

	<div class="sl-container sl-hero__content">
		<div class="sl-hero__eyebrow" data-lfr-editable-id="eyebrow" data-lfr-editable-type="text">Surf school &amp; surf trips</div>

		<h1 class="sl-hero__title" data-lfr-editable-id="title" data-lfr-editable-type="text">Ride your first wave</h1>

		<p class="sl-hero__text" data-lfr-editable-id="text" data-lfr-editable-type="text">Small groups, certified coaches, and boards for every level. Start on the sand on Monday and stand up by Friday.</p>

		<div class="sl-hero__actions">
			<a class="sl-button sl-button--accent" data-lfr-editable-id="primary" data-lfr-editable-type="link" href="/book">Book a lesson</a>

			<a class="sl-button sl-button--ghost" data-lfr-editable-id="secondary" data-lfr-editable-type="link" href="/trips">See our trips</a>
		</div>
	</div>
</section>
""",
	"""
.sl-hero {
	align-items: center;
	color: #ffffff;
	display: flex;
	min-height: 78vh;
	overflow: hidden;
	position: relative;
}

.sl-hero__image {
	height: 100%;
	inset: 0;
	object-fit: cover;
	position: absolute;
	width: 100%;
}

.sl-hero::after {
	background: linear-gradient(90deg, rgba(11, 79, 108, 0.85) 0%, rgba(11, 79, 108, 0.35) 60%, rgba(11, 79, 108, 0) 100%);
	content: '';
	inset: 0;
	position: absolute;
}

.sl-hero__content {
	padding-bottom: 96px;
	padding-top: 96px;
	position: relative;
	width: 100%;
	z-index: 1;
}

.sl-hero__eyebrow {
	color: var(--sl-accent, #20c9c3);
	font-weight: 600;
	letter-spacing: 0.14em;
	margin-bottom: 12px;
	text-transform: uppercase;
}

body .sl-hero__title {
	color: #ffffff;
	font-size: clamp(40px, 6vw, 72px);
	line-height: 1.05;
	margin-bottom: 20px;
	max-width: 640px;
}

.sl-hero__text {
	font-size: 20px;
	margin-bottom: 32px;
	max-width: 520px;
}

.sl-hero__actions {
	display: flex;
	flex-wrap: wrap;
	gap: 16px;
}
""",
	icon="picture",
)

fragment(
	"sl-page-hero",
	"Swell Lab Page Banner",
	"""
<section class="sl-page-hero">
	<img alt="" class="sl-page-hero__image" data-lfr-editable-id="image" data-lfr-editable-type="image" src="[resources:spot-reef.jpg]" />

	<div class="sl-container sl-page-hero__content">
		<h1 class="sl-page-hero__title" data-lfr-editable-id="title" data-lfr-editable-type="text">Page title</h1>

		<p class="sl-page-hero__text" data-lfr-editable-id="text" data-lfr-editable-type="text">A short line about this page.</p>
	</div>
</section>
""",
	"""
.sl-page-hero {
	color: #ffffff;
	overflow: hidden;
	position: relative;
}

.sl-page-hero__image {
	height: 100%;
	inset: 0;
	object-fit: cover;
	position: absolute;
	width: 100%;
}

.sl-page-hero::after {
	background: linear-gradient(90deg, rgba(11, 79, 108, 0.9) 0%, rgba(11, 79, 108, 0.45) 100%);
	content: '';
	inset: 0;
	position: absolute;
}

.sl-page-hero__content {
	padding-bottom: 80px;
	padding-top: 80px;
	position: relative;
	z-index: 1;
}

body .sl-page-hero__title {
	color: #ffffff;
	font-size: clamp(34px, 5vw, 56px);
	margin-bottom: 12px;
}

.sl-page-hero__text {
	font-size: 19px;
	margin: 0;
	max-width: 560px;
}
""",
	icon="picture",
)


def card(index, image, alt, tag, title, text, link_label=None, href=None, extra=""):
	link = ""

	if link_label:
		link = f"""
			<a class="sl-card__link" data-lfr-editable-id="link-{index}" data-lfr-editable-type="link" href="{href}">{link_label} &rarr;</a>"""

	return f"""
	<article class="sl-card">
		<img alt="{alt}" class="sl-card__image" data-lfr-editable-id="image-{index}" data-lfr-editable-type="image" src="[resources:{image}]" />

		<div class="sl-card__body">
			<span class="sl-tag" data-lfr-editable-id="tag-{index}" data-lfr-editable-type="text">{tag}</span>

			<h3 class="sl-card__title" data-lfr-editable-id="title-{index}" data-lfr-editable-type="text">{title}</h3>

			<p class="sl-card__text" data-lfr-editable-id="text-{index}" data-lfr-editable-type="text">{text}</p>{extra}{link}
		</div>
	</article>"""


def section(eyebrow, title, lead, body, modifier=""):
	return f"""
<section class="sl-section{modifier}">
	<div class="sl-container">
		<div class="sl-section__eyebrow" data-lfr-editable-id="eyebrow" data-lfr-editable-type="text">{eyebrow}</div>

		<h2 class="sl-section__title" data-lfr-editable-id="title" data-lfr-editable-type="text">{title}</h2>

		<p class="sl-section__lead" data-lfr-editable-id="lead" data-lfr-editable-type="text">{lead}</p>

		<div class="sl-grid">{body}
		</div>
	</div>
</section>
"""


CARD_LINK_CSS = """
.sl-card__link {
	color: var(--sl-primary, #0b4f6c);
	font-weight: 600;
	margin-top: auto;
	padding-top: 8px;
	text-decoration: none;
}

.sl-card__link:hover {
	color: var(--sl-accent-dark, #17a8a3);
}
"""

fragment(
	"sl-highlights",
	"Swell Lab Highlights",
	section(
		"Why Swell Lab",
		"Everything you need to catch waves",
		"From your first pop-up to your first barrel, we plan the sessions, the boards, and the trips.",
		card(1, "lesson-beginner.jpg", "Surfboard on the beach", "Lessons", "Learn with certified coaches", "Groups of up to six, with a coach in the water and video review after every session.", "See lessons", "/lessons")
		+ card(2, "trip-bali.jpg", "Palm trees on a tropical beach", "Trips", "Surf trips around the world", "Bali, Portugal, and Costa Rica, with lodging, transfers, and daily coaching.", "See trips", "/trips")
		+ card(3, "spot-reef.jpg", "Aerial view of a reef break", "Spots", "Know where to paddle out", "Our guide to the local breaks: level, best tide, and the right board for each one.", "See spots", "/spots"),
	),
	CARD_LINK_CSS,
	icon="cards2",
)

fragment(
	"sl-testimonials",
	"Swell Lab Testimonials",
	"""
<section class="sl-section sl-testimonials">
	<div class="sl-container">
		<div class="sl-section__eyebrow" data-lfr-editable-id="eyebrow" data-lfr-editable-type="text">Stories from the lineup</div>

		<h2 class="sl-section__title" data-lfr-editable-id="title" data-lfr-editable-type="text">Our surfers say it best</h2>

		<div class="sl-grid sl-testimonials__grid">
			<blockquote class="sl-quote">
				<p data-lfr-editable-id="quote-1" data-lfr-editable-type="text">I stood up on my third wave. The coaches made the whole thing feel easy and safe.</p>
				<cite data-lfr-editable-id="author-1" data-lfr-editable-type="text">Marina, Beginner course</cite>
			</blockquote>

			<blockquote class="sl-quote">
				<p data-lfr-editable-id="quote-2" data-lfr-editable-type="text">The Portugal trip was perfectly planned. Every morning we surfed the best spot for the swell.</p>
				<cite data-lfr-editable-id="author-2" data-lfr-editable-type="text">Daniel, Ericeira trip</cite>
			</blockquote>

			<blockquote class="sl-quote">
				<p data-lfr-editable-id="quote-3" data-lfr-editable-type="text">Video review changed my bottom turn in a week. Worth every session.</p>
				<cite data-lfr-editable-id="author-3" data-lfr-editable-type="text">Priya, Advanced coaching</cite>
			</blockquote>
		</div>
	</div>
</section>
""",
	"""
.sl-testimonials {
	background-color: #ffffff;
}

.sl-testimonials__grid {
	margin-top: 32px;
}

.sl-quote {
	background-color: var(--sl-sand, #f7f3ea);
	border-left: 4px solid var(--sl-accent, #20c9c3);
	border-radius: 16px;
	margin: 0;
	padding: 28px;
}

.sl-quote p {
	font-size: 18px;
	margin-bottom: 16px;
}

.sl-quote cite {
	color: var(--sl-primary, #0b4f6c);
	font-style: normal;
	font-weight: 600;
}
""",
	icon="quote-left",
)

fragment(
	"sl-cta",
	"Swell Lab Call to Action",
	"""
<section class="sl-cta">
	<img alt="" class="sl-cta__image" data-lfr-editable-id="image" data-lfr-editable-type="image" src="[resources:surf-shack.jpg]" />

	<div class="sl-container sl-cta__content">
		<h2 class="sl-cta__title" data-lfr-editable-id="title" data-lfr-editable-type="text">The next swell arrives on Friday</h2>

		<p class="sl-cta__text" data-lfr-editable-id="text" data-lfr-editable-type="text">Book your spot now. Boards and wetsuits are on us.</p>

		<a class="sl-button sl-button--accent" data-lfr-editable-id="cta" data-lfr-editable-type="link" href="/book">Book a lesson</a>
	</div>
</section>
""",
	"""
.sl-cta {
	color: #ffffff;
	overflow: hidden;
	position: relative;
	text-align: center;
}

.sl-cta__image {
	height: 100%;
	inset: 0;
	object-fit: cover;
	position: absolute;
	width: 100%;
}

.sl-cta::after {
	background-color: rgba(11, 79, 108, 0.82);
	content: '';
	inset: 0;
	position: absolute;
}

.sl-cta__content {
	padding-bottom: 88px;
	padding-top: 88px;
	position: relative;
	z-index: 1;
}

body .sl-cta__title {
	color: #ffffff;
	font-size: clamp(30px, 4vw, 44px);
	margin-bottom: 12px;
}

.sl-cta__text {
	font-size: 19px;
	margin-bottom: 28px;
}
""",
	icon="megaphone-full",
)


def details(index, rows):
	items = "".join(
		f"""
				<li><span>{label}</span><strong data-lfr-editable-id="{key}-{index}" data-lfr-editable-type="text">{value}</strong></li>"""
		for key, label, value in rows
	)

	return f"""

			<ul class="sl-details">{items}
			</ul>"""


DETAILS_CSS = """
.sl-details {
	border-top: 1px solid rgba(11, 79, 108, 0.1);
	list-style: none;
	margin: 8px 0 0;
	padding: 12px 0 0;
}

.sl-details li {
	display: flex;
	justify-content: space-between;
	padding: 4px 0;
}

.sl-details span {
	color: var(--sl-muted, #5b6b77);
}

.sl-details strong {
	color: var(--sl-ink, #1d2b36);
}
"""

fragment(
	"sl-lessons",
	"Swell Lab Lessons",
	section(
		"Lessons",
		"Pick your level",
		"Every course includes the board, the wetsuit, and a coach in the water. Sessions follow the tide, so the times change during the week.",
		card(1, "lesson-beginner.jpg", "Surfboard standing on the sand", "Beginner", "First Waves", "Five days to learn safety, paddling, and your first pop-ups on the white water.", "Book Beginner", "/book?product=beginner", details(1, [("duration", "Duration", "5 days"), ("group", "Group", "Up to 6"), ("price", "Price", "R$ 890")]))
		+ card(2, "lesson-intermediate.jpg", "Surfer on an open-face wave", "Intermediate", "Green Waves", "Leave the white water: reading the lineup, catching unbroken waves, and trimming down the line.", "Book Intermediate", "/book?product=intermediate", details(2, [("duration", "Duration", "5 days"), ("group", "Group", "Up to 4"), ("price", "Price", "R$ 1.190")]))
		+ card(3, "lesson-advanced.jpg", "Surfer doing a top turn", "Advanced", "Performance Coaching", "One-on-one sessions with video analysis to sharpen your turns and your wave selection.", "Book Advanced", "/book?product=advanced", details(3, [("duration", "Duration", "3 days"), ("group", "Group", "1 to 2"), ("price", "Price", "R$ 1.650")])),
	),
	CARD_LINK_CSS + DETAILS_CSS,
	icon="cards2",
)

fragment(
	"sl-trips",
	"Swell Lab Trips",
	section(
		"Trips",
		"Surf trips for the season",
		"Small groups, lodging near the break, and a coach who knows every spot. Flights are not included.",
		card(1, "trip-bali.jpg", "Palm trees and a calm tropical bay", "Indonesia", "Bali Reef Week", "Warm water and long lefts at Uluwatu, Padang Padang, and the Bukit reefs.", "Book Bali", "/book?product=trip-bali", details(1, [("dates", "Dates", "May 10 to 17"), ("nights", "Nights", "7"), ("price", "From", "US$ 1,890")]))
		+ card(2, "trip-portugal.jpg", "Surfer waiting for a wave at sunset", "Portugal", "Ericeira Point Breaks", "Europe's World Surfing Reserve: consistent swell, point breaks, and a great town.", "Book Portugal", "/book?product=trip-portugal", details(2, [("dates", "Dates", "Sep 20 to 27"), ("nights", "Nights", "7"), ("price", "From", "US$ 1,450")]))
		+ card(3, "trip-costa-rica.jpg", "Turquoise water around green islands", "Costa Rica", "Nosara Jungle Surf", "Beach breaks for every level, yoga at sunrise, and the jungle a few steps from the sand.", "Book Costa Rica", "/book?product=trip-costa-rica", details(3, [("dates", "Dates", "Dec 2 to 9"), ("nights", "Nights", "7"), ("price", "From", "US$ 1,690")])),
	),
	CARD_LINK_CSS + DETAILS_CSS,
	icon="cards2",
)

fragment(
	"sl-spots",
	"Swell Lab Spots",
	section(
		"Local spots",
		"Where we paddle out",
		"Our coaches pick the spot every morning from the swell, the wind, and the tide. These are the four we surf the most.",
		card(1, "spot-sunset-beach.jpg", "Beach with gentle waves at sunset", "Beginner", "Praia do Rosa", "A wide sandy beach with soft waves on the inside. Our classroom.", None, None, details(1, [("tide", "Best tide", "Mid to high"), ("swell", "Swell", "South-east"), ("board", "Board", "Foam 8'")]))
		+ card(2, "lesson-intermediate.jpg", "Clean wave breaking along the coast", "Intermediate", "Ferrugem", "Fast peaks along the beach with a lively lineup on the weekends.", None, None, details(2, [("tide", "Best tide", "Low to mid"), ("swell", "Swell", "East"), ("board", "Board", "Funboard 7'")]))
		+ card(3, "spot-reef.jpg", "Aerial view of a reef with breaking waves", "Advanced", "Silveira Reef", "A powerful right over rocks. Only for experienced surfers.", None, None, details(3, [("tide", "Best tide", "Mid"), ("swell", "Swell", "South"), ("board", "Board", "Shortboard 6'")]))
		+ card(4, "lesson-advanced.jpg", "Big wave with a surfer on the face", "Advanced", "Guarda Point", "The left that wakes up with a big south swell. Pure adrenaline.", None, None, details(4, [("tide", "Best tide", "Low"), ("swell", "Swell", "South"), ("board", "Board", "Step-up 6'6&quot;")])),
	),
	DETAILS_CSS,
	icon="map",
)

fragment(
	"sl-booking-form",
	"Swell Lab Booking Form",
	"""
<section class="sl-section">
	<div class="sl-container sl-booking">
		<div class="sl-booking__intro">
			<div class="sl-section__eyebrow" data-lfr-editable-id="eyebrow" data-lfr-editable-type="text">Book</div>

			<h2 class="sl-section__title" data-lfr-editable-id="title" data-lfr-editable-type="text">Save your spot</h2>

			<p class="sl-section__lead" data-lfr-editable-id="lead" data-lfr-editable-type="text">Tell us what you want to do and when. A coach answers within one day to confirm the details.</p>
		</div>

		<form class="sl-booking__form" novalidate>
			<label>Full name<input name="fullName" required type="text" /></label>

			<label>Email<input name="email" required type="email" /></label>

			<label>What do you want to book?
				<select name="product" required>
					<option value="beginner">Beginner lesson: First Waves</option>
					<option value="intermediate">Intermediate lesson: Green Waves</option>
					<option value="advanced">Advanced coaching</option>
					<option value="trip-bali">Trip: Bali Reef Week</option>
					<option value="trip-portugal">Trip: Ericeira Point Breaks</option>
					<option value="trip-costa-rica">Trip: Nosara Jungle Surf</option>
				</select>
			</label>

			<label>Preferred date<input name="preferredDate" required type="date" /></label>

			<label class="sl-booking__wide">Anything we should know?<textarea name="message" rows="4"></textarea></label>

			<button class="sl-button sl-button--accent sl-booking__submit" type="submit">Request booking</button>

			<p aria-live="polite" class="sl-booking__status"></p>
		</form>
	</div>
</section>
""",
	"""
.sl-booking {
	display: grid;
	gap: 40px;
	grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.sl-booking__form {
	background-color: #ffffff;
	border-radius: 20px;
	box-shadow: 0 10px 30px rgba(11, 79, 108, 0.08);
	display: grid;
	gap: 18px;
	grid-template-columns: 1fr 1fr;
	padding: 32px;
}

.sl-booking__form label {
	color: var(--sl-primary, #0b4f6c);
	display: flex;
	flex-direction: column;
	font-size: 14px;
	font-weight: 600;
	gap: 6px;
	min-width: 0;
}

.sl-booking__form input,
.sl-booking__form select,
.sl-booking__form textarea {
	background-color: var(--sl-sand, #f7f3ea);
	border: 1px solid transparent;
	border-radius: 12px;
	color: var(--sl-ink, #1d2b36);
	font: inherit;
	font-weight: 400;
	min-width: 0;
	padding: 10px 14px;
	width: 100%;
}

.sl-booking__form input:focus,
.sl-booking__form select:focus,
.sl-booking__form textarea:focus {
	border-color: var(--sl-accent, #20c9c3);
	outline: none;
}

.sl-booking__wide,
.sl-booking__submit,
.sl-booking__status {
	grid-column: 1 / -1;
}

.sl-booking__submit {
	border: 0;
	cursor: pointer;
	justify-self: start;
}

.sl-booking__status {
	margin: 0;
	min-height: 1.5em;
}

.sl-booking__status--error {
	color: #c0392b;
}

.sl-booking__status--success {
	color: var(--sl-primary, #0b4f6c);
	font-weight: 600;
}

@media (max-width: 640px) {
	.sl-booking__form {
		grid-template-columns: 1fr;
	}
}
""",
	"""
const form = fragmentElement.querySelector('.sl-booking__form');
const status = fragmentElement.querySelector('.sl-booking__status');

const product = new URLSearchParams(window.location.search).get('product');

if (product && form.elements.product.querySelector(`option[value="${product}"]`)) {
	form.elements.product.value = product;
}

function setStatus(message, type) {
	status.className = `sl-booking__status sl-booking__status--${type}`;
	status.textContent = message;
}

form.addEventListener('submit', async (event) => {
	event.preventDefault();

	if (!form.checkValidity()) {
		setStatus('Please fill in your name, email, and preferred date.', 'error');

		return;
	}

	const booking = Object.fromEntries(new FormData(form));

	try {
		const response = await fetch('/o/c/surfbookings', {
			body: JSON.stringify(booking),
			headers: {
				'Content-Type': 'application/json',
				'x-csrf-token': Liferay.authToken,
			},
			method: 'POST',
		});

		if (!response.ok) {
			throw new Error(`/o/c/surfbookings returned ${response.status}`);
		}

		if (window.Analytics) {
			window.Analytics.send('bookingRequested', 'SwellLab', {
				product: booking.product,
			});
		}

		form.reset();

		setStatus('Thanks! Your request is in. A coach will email you within one day.', 'success');
	}
	catch (error) {
		console.error(error);

		setStatus('We could not send your request. Please try again in a moment.', 'error');
	}
});
""",
	icon="forms",
)


fragment(
	"sl-dashboard-header",
	"Swell Lab Dashboard Header",
	"""
<section class="sl-dashboard-header">
	<div class="sl-container">
		<div class="sl-section__eyebrow" data-lfr-editable-id="eyebrow" data-lfr-editable-type="text">Swell Lab analytics</div>

		<h1 class="sl-dashboard-header__title" data-lfr-editable-id="title" data-lfr-editable-type="text">Surf school dashboard</h1>

		<p class="sl-dashboard-header__text" data-lfr-editable-id="text" data-lfr-editable-type="text">Live data from Liferay Data Platform. Open the cog on any card to pick the metric, the chart, and the period. Each card keeps its setup in Liferay Objects.</p>

		<ul class="sl-dashboard-header__stack">
			<li>LDP Headless API</li>
			<li>Client Extensions</li>
			<li>Liferay Objects</li>
			<li>Fragments</li>
		</ul>
	</div>
</section>
""",
	"""
.sl-dashboard-header {
	padding: 56px 0 24px;
}

body .sl-dashboard-header__title {
	font-size: clamp(32px, 4vw, 48px);
	margin-bottom: 12px;
}

.sl-dashboard-header__text {
	color: var(--sl-muted, #5b6b77);
	font-size: 18px;
	margin-bottom: 20px;
	max-width: 720px;
}

.sl-dashboard-header__stack {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	list-style: none;
	margin: 0;
	padding: 0;
}

.sl-dashboard-header__stack li {
	background-color: rgba(32, 201, 195, 0.15);
	border-radius: 999px;
	color: var(--sl-primary, #0b4f6c);
	font-size: 13px;
	font-weight: 600;
	padding: 6px 14px;
}

.sl-dashboard {
	margin-left: auto !important;
	margin-right: auto !important;
	max-width: 1180px !important;
	padding: 0 24px 72px !important;
}

.sl-dashboard .portlet {
	margin-bottom: 24px;
}

/* Layout rows clip their content, which cut the card's settings popover */

.sl-dashboard .lfr-layout-structure-item-row {
	overflow: visible !important;
}

ldp-metric-card,
ldp-metric-card-fragment,
ldp-visitors-behavior,
ldp-visitors-behavior-fragment {
	--ldp-accent: #0b4f6c;
	--ldp-accent-soft: rgba(11, 79, 108, 0.12);
	--ldp-border: rgba(11, 79, 108, 0.06);
	--ldp-border-strong: rgba(11, 79, 108, 0.2);
	--ldp-font: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif;
	--ldp-heading-font: Poppins, Inter, system-ui, sans-serif;
	--ldp-muted: #5b6b77;
	--ldp-palette: #0a7a9e, #e0932b, #17a9a3, #e2574f, #4f7fe8, #2f9a62, #9a5fd6, #b9763f;
	--ldp-radius: 20px;
	--ldp-shadow: 0 10px 30px rgba(11, 79, 108, 0.08);
	--ldp-subtle: #f7f3ea;
	--ldp-text: #1d2b36;
	--ldp-title: #0b4f6c;
}
""",
	icon="analytics",
)


ACADEMY_CONTENTS = [
	("board-guide", "lesson-beginner.jpg", "Gear", "How to pick your first board", "Volume, length, and shape decide how fast you stand up. A simple guide to choosing the foam board that makes your first waves easy.", "/lessons"),
	("tide-101", "spot-sunset-beach.jpg", "Ocean", "Read the tide like a local", "Low, mid, or high? Learn the three tide windows that turn a flat beach into perfect peaks, with real examples from Praia do Rosa.", "/spots"),
	("pop-up-drill", "lesson-intermediate.jpg", "Technique", "The 5-minute pop-up drill", "Practice the move that gets you on your feet. Do it at home before your first lesson and stand up on day one.", "/lessons"),
	("wetsuit-guide", "surf-shack.jpg", "Gear", "Wetsuit thickness by season", "Cold feet end sessions early. Which thickness to wear in every month of the year in southern Brazil.", "/book"),
	("surf-info", "spot-reef.jpg", "General", "Information", "Some information about surfing.", "/lessons"),
	("lineup-etiquette", "lesson-advanced.jpg", "Culture", "Surf etiquette: who has priority", "Drop-ins are the fastest way to make enemies. The five lineup rules every surfer should know before paddling out.", "/spots"),
	("wave-choice", "hero-barrel.jpg", "Ocean", "Choose the right wave", "Not every wave is yours. How to spot the ones that will carry you, and the ones that will close out on your head.", "/spots"),
	("paddle-power", "trip-portugal.jpg", "Technique", "Paddle longer, not harder", "Most beginners run out of energy in ten minutes. Fix your arm stroke and body position to stay out twice as long.", "/lessons"),
	("forecast-basics", "trip-costa-rica.jpg", "Ocean", "Read a surf forecast in 3 steps", "Swell size, period, and wind direction. The three numbers that tell you if tomorrow is worth the early alarm.", "/spots"),
	("trip-packing", "trip-bali.jpg", "Trips", "The surf trip packing list", "Board bag, leash, wax, reef booties, and the one item everyone forgets. Pack once, surf the whole week.", "/trips"),
	("post-surf-stretch", "spot-reef.jpg", "Body", "A 10-minute stretch after surfing", "Shoulders, lower back, and hips take the hit. A short routine on the sand that keeps you surfing tomorrow.", "/lessons"),
	("sun-care", "spot-sunset-beach.jpg", "Body", "Sun care for long sessions", "Reef-safe sunscreen, zinc, and when to reapply. Protect your skin without hurting the reefs you surf.", "/book"),
]


def academy_card(index, content_id, image, tag, title, text, href):
	return f"""
		<article class="sl-card sl-academy__item" data-content-id="{content_id}">
			<img alt="" class="sl-card__image" data-lfr-editable-id="image-{index}" data-lfr-editable-type="image" src="[resources:{image}]" />

			<div class="sl-card__body">
				<span class="sl-tag" data-lfr-editable-id="tag-{index}" data-lfr-editable-type="text">{tag}</span>

				<h3 class="sl-card__title" data-content-title data-lfr-editable-id="title-{index}" data-lfr-editable-type="text">{title}</h3>

				<p class="sl-card__text" data-content-text data-lfr-editable-id="text-{index}" data-lfr-editable-type="text">{text}</p>

				<a class="sl-card__link sl-academy__more" href="/learn-article?id={content_id}"><span data-lfr-editable-id="more-{index}" data-lfr-editable-type="text">Read more &rarr;</span></a>
			</div>
		</article>"""


fragment(
	"sl-academy",
	"Swell Lab Academy",
	f"""
<section class="sl-section sl-academy">
	<div class="sl-container">
		<div class="sl-section__eyebrow" data-lfr-editable-id="eyebrow" data-lfr-editable-type="text">Surf Academy</div>

		<h2 class="sl-section__title" data-lfr-editable-id="title" data-lfr-editable-type="text">Learn before you paddle out</h2>

		<p class="sl-section__lead" data-lfr-editable-id="lead" data-lfr-editable-type="text">Short guides from our coaches. Read one tonight and surf better tomorrow.</p>

		<div class="sl-grid">{"".join(academy_card(i + 1, *content) for i, content in enumerate(ACADEMY_CONTENTS))}
		</div>
	</div>
</section>
""",
	CARD_LINK_CSS + """
.sl-academy__item {
	position: relative;
}

.sl-academy__more {
	align-self: flex-start;
	font-weight: 600;
}
""",
	"""
// "Read more" sends the surfContentClicked custom event to LDP, with the
// block's id, its current title, and its position on the page, then opens the
// article. The event is queued and sent from the article page.

fragmentElement.querySelectorAll('[data-content-id]').forEach((item, index) => {
	item.addEventListener('click', (event) => {
		if (!event.target.closest('.sl-academy__more')) {
			return;
		}

		window.Analytics?.track('surfContentClicked', {
			contentId: item.dataset.contentId,
			contentTitle: item.querySelector('[data-content-title]')?.textContent.trim(),
			position: index + 1,
		});
	});
});
""",
	icon="cards2",
)


fragment(
	"sl-sign-in",
	"Swell Lab Sign In",
	"""
<section class="sl-sign-in">
	<div class="sl-container">
		<div class="sl-sign-in__card">
			<div class="sl-sign-in__photo" style="background-image: url('[resources:hero-barrel.jpg]');">
				<div class="sl-sign-in__photo-text">
					<p class="sl-sign-in__eyebrow">Swell Lab crew</p>

					<p class="sl-sign-in__quote" data-lfr-editable-id="quote" data-lfr-editable-type="text">Check the bookings, the lineup, and how the site is doing today.</p>
				</div>
			</div>

			<div class="sl-sign-in__body">
				<h1 class="sl-sign-in__title" data-lfr-editable-id="title" data-lfr-editable-type="text">Welcome back</h1>

				<p class="sl-sign-in__lead" data-lfr-editable-id="lead" data-lfr-editable-type="text">Sign in to open the surf school dashboard.</p>

				<lfr-drop-zone data-lfr-drop-zone-id="form"></lfr-drop-zone>
			</div>
		</div>
	</div>
</section>
""",
	"""
.sl-sign-in {
	padding: 64px 0 96px;
}

.sl-sign-in__card {
	background-color: var(--sl-white);
	border-radius: 24px;
	box-shadow: 0 24px 60px rgba(11, 79, 108, 0.12);
	display: grid;
	grid-template-columns: 1fr 1fr;
	margin: 0 auto;
	max-width: 980px;
	overflow: hidden;
}

.sl-sign-in__photo {
	background-position: center;
	background-size: cover;
	display: flex;
	min-height: 520px;
	position: relative;
}

.sl-sign-in__photo::before {
	background: linear-gradient(180deg, rgba(11, 79, 108, 0) 35%, rgba(11, 79, 108, 0.85) 100%);
	content: '';
	inset: 0;
	position: absolute;
}

.sl-sign-in__photo-text {
	align-self: flex-end;
	color: var(--sl-white);
	padding: 36px;
	position: relative;
}

.sl-sign-in__eyebrow {
	color: var(--sl-accent);
	font-size: 13px;
	font-weight: 600;
	letter-spacing: 0.12em;
	margin-bottom: 8px;
	text-transform: uppercase;
}

.sl-sign-in__quote {
	font-family: Poppins, Inter, system-ui, sans-serif;
	font-size: 22px;
	font-weight: 600;
	line-height: 1.35;
	margin: 0;
}

.sl-sign-in__body {
	padding: 56px 48px;
}

.sl-sign-in .sl-sign-in__title {
	font-size: 34px;
	margin-bottom: 8px;
}

.sl-sign-in__lead {
	color: var(--sl-muted);
	margin-bottom: 28px;
}

.sl-sign-in .portlet-header,
.sl-sign-in .portlet-title-default,
.sl-sign-in .portlet-options {
	display: none;
}

.sl-sign-in .portlet-content,
.sl-sign-in .portlet-body {
	background: none;
	border: 0;
	padding: 0;
}

.sl-sign-in .sign-in-form .panel,
.sl-sign-in .sign-in-form .panel-body {
	background: none;
	border: 0;
	margin: 0;
	padding: 0;
}

.sl-sign-in .sign-in-form .form-group {
	margin-bottom: 18px;
}

.sl-sign-in .sign-in-form label {
	color: var(--sl-primary);
	font-size: 14px;
	font-weight: 600;
}

.sl-sign-in .sign-in-form .form-control {
	background-color: var(--sl-sand);
	border: 2px solid transparent;
	border-radius: 12px;
	color: var(--sl-ink);
	height: 48px;
	padding: 0 16px;
}

.sl-sign-in .sign-in-form .form-control:focus {
	background-color: var(--sl-white);
	border-color: var(--sl-accent);
	box-shadow: 0 0 0 4px rgba(32, 201, 195, 0.18);
}

.sl-sign-in .sign-in-form .btn-primary {
	background-color: var(--sl-accent);
	border: 0;
	border-radius: 999px;
	color: var(--sl-primary);
	font-weight: 600;
	padding: 12px 26px;
	width: 100%;
}

.sl-sign-in .sign-in-form .btn-primary:hover,
.sl-sign-in .sign-in-form .btn-primary:focus {
	background-color: var(--sl-accent-dark);
	color: var(--sl-white);
}

.sl-sign-in .sign-in-form .button-holder {
	margin-top: 8px;
}

.sl-sign-in .navigation {
	display: flex;
	flex-wrap: wrap;
	gap: 8px 20px;
	justify-content: center;
	margin-top: 20px;
}

.sl-sign-in .navigation a {
	color: var(--sl-primary);
	font-size: 14px;
	font-weight: 500;
}

.sl-sign-in .navigation a:hover {
	color: var(--sl-accent-dark);
}

.sl-sign-in .alert {
	border-radius: 12px;
}

@media (max-width: 760px) {
	.sl-sign-in {
		padding: 32px 0 64px;
	}

	.sl-sign-in__card {
		grid-template-columns: 1fr;
	}

	.sl-sign-in__photo {
		min-height: 200px;
	}

	.sl-sign-in__body {
		padding: 36px 24px;
	}
}
""",
	icon="user",
)


fragment(
	"sl-blog-card",
	"Swell Lab Blog Card",
	"""
<article class="sl-card sl-blog-card">
	<div class="sl-card__body">
		<span class="sl-tag">Surf Journal</span>

		<h3 class="sl-card__title" data-lfr-editable-id="title" data-lfr-editable-type="text">Blog title</h3>

		<p class="sl-card__text" data-lfr-editable-id="subtitle" data-lfr-editable-type="text">A short line about the post.</p>

		<a class="sl-card__link" data-lfr-editable-id="link" data-lfr-editable-type="link" href="#">Read the post &rarr;</a>
	</div>
</article>
""",
	"""
.sl-blog-card {
	border: 1px solid rgba(11, 79, 108, 0.08);
	box-shadow: none;
	height: 100%;
}

.sl-blog-card .sl-card__body {
	gap: 10px;
	padding: 28px 26px;
}

.sl-blog-card .sl-tag {
	align-self: flex-start;
}

.sl-blog-list {
	padding: 56px 0 72px;
}

/* The collection lists posts oldest first and cannot be sorted, so the list
   is reversed visually: the newest post comes first, reading row by row */

.sl-blog-list .lfr-layout-structure-item-collection > .container-fluid {
	display: flex;
	flex-direction: row-reverse;
	flex-wrap: wrap-reverse;
	justify-content: flex-end;
	margin-inline: -12px;
	overflow: visible !important;
	width: calc(100% + 24px);
	row-gap: 40px;
}

.sl-blog-list .lfr-layout-structure-item-collection .row {
	display: contents;
}
""",
	"""
// "Read the post" sends the surfBlogPostClicked custom event to LDP before the
// post opens. The post id is the external reference code that DXP prints on
// the mapped title.

if (layoutMode === 'view') {
	fragmentElement.querySelector('.sl-card__link')?.addEventListener('click', () => {
		const title = fragmentElement.querySelector('[data-analytics-external-reference-code]');

		window.Analytics?.track('surfBlogPostClicked', {
			postId: title?.dataset.analyticsExternalReferenceCode,
			postTitle: fragmentElement.querySelector('.sl-card__title')?.textContent.trim(),
		});
	});
}
""",
	icon="blogs",
)


fragment(
	"sl-blog-post",
	"Swell Lab Blog Post",
	"""
<article class="sl-blog-post">
	<div class="sl-container sl-blog-post__container">
		<a class="sl-blog-post__back" href="/blog">&larr; Surf Journal</a>

		<div class="sl-blog-post__content" data-lfr-editable-id="content" data-lfr-editable-type="rich-text">
			<p>The post content.</p>
		</div>
	</div>
</article>
""",
	"""
.sl-blog-post {
	background: var(--sl-sand, #f7f3ea);
	padding: 56px 0 72px;
}

.sl-blog-post__container {
	max-width: 760px;
}

.sl-blog-post__back {
	color: var(--sl-primary, #0b4f6c);
	display: inline-block;
	font-weight: 600;
	margin-bottom: 24px;
	text-decoration: none;
}

.sl-blog-post__content {
	background: #fff;
	border-radius: 20px;
	box-shadow: 0 12px 32px rgba(11, 79, 108, 0.08);
	color: var(--sl-ink, #1d2b36);
	font-size: 1.125rem;
	line-height: 1.75;
	padding: 40px 44px;
}

.sl-blog-post__content > :last-child {
	margin-bottom: 0;
}

@media (max-width: 600px) {
	.sl-blog-post__content {
		padding: 28px 22px;
	}
}
""",
	icon="blogs",
)

# The article behind each "Read more": one page, /learn-article?id=<content id>,
# filled from the same contents as the Surf Academy blocks

ACADEMY_BODIES = {
	"board-guide": [
		"Your first board should float you, not fight you. Look for a soft-top between 8 and 9 feet with plenty of volume: around twice your body weight in liters is a good start.",
		"Length gives you glide and stability, width keeps you balanced while you pop up, and a rounded nose forgives late take-offs. Leave the short, pointy boards for later.",
	],
	"tide-101": [
		"Tides move the water over sand bars and reefs, and that changes how waves break. At Praia do Rosa, mid tide on a rising swell gives the most consistent peaks.",
		"Low tide can expose rocks at the point and make waves dump hard. High tide often slows the beach break down. Check a tide chart and plan for the two hours around mid tide.",
	],
	"pop-up-drill": [
		"Lie flat on the floor, hands under your chest. In one move, push up and bring your front foot between your hands, landing low with knees bent and eyes forward.",
		"Repeat it ten times, rest, and do three rounds. Five minutes a day for a week and the move becomes automatic, so in the water you think about the wave, not your feet.",
	],
	"wetsuit-guide": [
		"Water in southern Brazil goes from 24 °C in summer to 16 °C in winter. Above 22 °C a shorty or a top is enough; between 17 and 22 °C wear a 3/2 mm full suit.",
		"Below 17 °C switch to a 4/3 mm with booties. Cold costs energy: a warmer suit keeps you paddling longer and catching more waves.",
	],
	"surf-info": [
		"Surfing is riding waves on a board.",
		"There are many things to know about it.",
	],
	"lineup-etiquette": [
		"The surfer closest to the peak has priority. Never drop in on someone already riding, and paddle around the break, not through it.",
		"Hold your board, call your wave, and wait your turn. If you get in someone's way, a quick apology keeps the lineup friendly.",
	],
	"wave-choice": [
		"Good waves peak and peel to one side. Watch the set for a few minutes from the beach and notice where the peak forms and which way it breaks.",
		"Avoid the waves that stand up all at once along their length: they close out. Pick the shoulder of a peeling wave and paddle early.",
	],
	"paddle-power": [
		"Lie centered on the board with your chest slightly raised and your feet together. If the nose dips or sticks up, move until it sits just above the water.",
		"Reach forward, pull deep under the board, and let your hands exit at your hips. Long, steady strokes beat fast splashing every time.",
	],
	"forecast-basics": [
		"Start with swell size and period: a 1 m swell at 10 seconds or more brings more power than a 2 m swell at 6 seconds.",
		"Then check the wind. Offshore or no wind keeps the waves clean; strong onshore wind makes them messy. Good size, long period, and light offshore is the morning to wake up early.",
	],
	"trip-packing": [
		"Pack a padded board bag, two leashes, base and top wax for the water temperature, fins with a key, and reef booties for rocky breaks.",
		"Add reef-safe sunscreen, a rash guard, a ding repair kit, and the item everyone forgets: a spare fin screw.",
	],
	"post-surf-stretch": [
		"After a session, spend ten minutes on the sand: open your chest and shoulders against your board, then stretch your hip flexors in a low lunge.",
		"Finish with a child's pose for your lower back. Your body recovers faster and you paddle out stronger the next day.",
	],
	"sun-care": [
		"Use a reef-safe sunscreen with zinc oxide, apply it twenty minutes before paddling out, and reapply every two hours or after a long session.",
		"Wear a rash guard and a cap for the longest sessions. Your skin and the reefs you surf both stay healthy.",
	],
}

ACADEMY_ARTICLES = {
	content_id: {
		"body": ACADEMY_BODIES[content_id],
		"href": href,
		"image": "/documents/d/guest/" + image.replace(".jpg", "-jpg") + "?download=true",
		"lead": text,
		"tag": tag,
		"title": title,
	}
	for content_id, image, tag, title, text, href in ACADEMY_CONTENTS
}

fragment(
	"sl-academy-article",
	"Swell Lab Academy Article",
	"""
<article class="sl-article">
	<div class="sl-container sl-article__container">
		<a class="sl-article__back" href="/learn">&larr; Surf Academy</a>

		<div class="sl-article__body" data-article-body>
			<p>Loading the article...</p>
		</div>
	</div>

	<script data-articles type="application/json">"""
	+ json.dumps(ACADEMY_ARTICLES, ensure_ascii=False)
	+ """</script>
</article>
""",
	"""
.sl-article {
	background: var(--sl-sand, #f7f3ea);
	padding: 56px 0 72px;
}

.sl-article__container {
	max-width: 820px;
}

.sl-article__back {
	color: var(--sl-primary, #0b4f6c);
	display: inline-block;
	font-weight: 600;
	margin-bottom: 24px;
	text-decoration: none;
}

.sl-article__body {
	background: #fff;
	border-radius: 20px;
	box-shadow: 0 12px 32px rgba(11, 79, 108, 0.08);
	overflow: hidden;
}

.sl-article__image {
	aspect-ratio: 16 / 7;
	display: block;
	object-fit: cover;
	width: 100%;
}

.sl-article__content {
	color: var(--sl-ink, #1d2b36);
	display: grid;
	gap: 16px;
	padding: 36px 44px 44px;
}

.sl-article__content h1 {
	color: var(--sl-primary, #0b4f6c);
	font: 700 2.25rem/1.2 Poppins, Inter, sans-serif;
	margin: 0;
}

.sl-article__lead {
	color: var(--sl-muted, #5b6b77);
	font-size: 1.25rem;
	line-height: 1.5;
	margin: 0;
}

.sl-article__content p {
	font-size: 1.0625rem;
	line-height: 1.75;
	margin: 0;
}

.sl-article__content .sl-tag {
	justify-self: start;
}

.sl-article__cta {
	color: var(--sl-primary, #0b4f6c);
	font-weight: 600;
	justify-self: start;
	text-decoration: none;
}

@media (max-width: 600px) {
	.sl-article__content {
		padding: 28px 22px 32px;
	}

	.sl-article__content h1 {
		font-size: 1.75rem;
	}
}
""",
	"""
// Renders the article named by ?id= from the contents embedded in the
// fragment: the same title, image, and text as its Surf Academy block

const articles = JSON.parse(fragmentElement.querySelector('[data-articles]').textContent);
const body = fragmentElement.querySelector('[data-article-body]');
const article = articles[new URLSearchParams(window.location.search).get('id')];

const escape = (text) => {
	const element = document.createElement('span');

	element.textContent = text;

	return element.innerHTML;
};

if (!article) {
	body.innerHTML = '<div class="sl-article__content"><h1>Article not found</h1><p>This guide is not available. <a href="/learn">See all the Surf Academy guides</a>.</p></div>';
}
else {
	body.innerHTML = `
		<img alt="" class="sl-article__image" src="${article.image}" />
		<div class="sl-article__content">
			<span class="sl-tag">${escape(article.tag)}</span>
			<h1>${escape(article.title)}</h1>
			<p class="sl-article__lead">${escape(article.lead)}</p>
			${article.body.map((paragraph) => `<p>${escape(paragraph)}</p>`).join('')}
			<a class="sl-article__cta" href="${article.href}">Keep learning in the water &rarr;</a>
		</div>
	`;

	if (layoutMode === 'view') {
		document.title = `${article.title} - Swell Lab`;
	}
}
""",
	icon="document",
)

def write(path, content):
	os.makedirs(os.path.dirname(path), exist_ok=True)

	with open(path, "w") as file:
		file.write(content)


write(os.path.join(COLLECTION, "collection.json"), json.dumps({"description": "Fragments of the Swell Lab surf school demo site.", "name": "Swell Lab"}, indent="\t") + "\n")

for key, (name, html, css, js, icon) in FRAGMENTS.items():
	directory = os.path.join(COLLECTION, key)

	descriptor = {"cssPath": "styles.css", "htmlPath": "index.html", "icon": icon, "name": name, "type": "section"}

	if js:
		descriptor["jsPath"] = "main.js"

		write(os.path.join(directory, "main.js"), js)

	write(os.path.join(directory, "fragment.json"), json.dumps(dict(sorted(descriptor.items())), indent="\t") + "\n")
	write(os.path.join(directory, "index.html"), html)
	write(os.path.join(directory, "styles.css"), css)

print(len(FRAGMENTS), "fragments")
