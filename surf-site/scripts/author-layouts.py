import json
import os
import sys

ROOT = os.path.join(os.path.expanduser(sys.argv[1]), "src")


def write_json(path, data):
	os.makedirs(os.path.dirname(path), exist_ok=True)

	with open(path, "w") as file:
		file.write(json.dumps(data, indent="\t") + "\n")


def write_text(path, text):
	with open(path, "w") as file:
		file.write(text.strip() + "\n")


# Style Book

TOKENS = {
	"bodyBgColor": ("body-bg", "#F7F3EA"),
	"bodyColor": ("body-color", "#1D2B36"),
	"borderRadius": ("border-radius", "0.75rem"),
	"borderRadiusLg": ("border-radius-lg", "1.25rem"),
	"borderRadiusSm": ("border-radius-sm", "0.5rem"),
	"brandColor1": ("brand-color-1", "#0B4F6C"),
	"brandColor2": ("brand-color-2", "#20C9C3"),
	"brandColor3": ("brand-color-3", "#F7F3EA"),
	"brandColor4": ("brand-color-4", "#1D2B36"),
	"btnLinkColor": ("btn-link-color", "#0B4F6C"),
	"btnPrimaryBackgroundColor": ("btn-primary-background-color", "#0B4F6C"),
	"btnPrimaryBorderColor": ("btn-primary-border-color", "#0B4F6C"),
	"btnPrimaryColor": ("btn-primary-color", "#FFFFFF"),
	"btnSecondaryBackgroundColor": ("btn-secondary-background-color", "#FFFFFF"),
	"btnSecondaryBorderColor": ("btn-secondary-border-color", "#20C9C3"),
	"btnSecondaryColor": ("btn-secondary-color", "#0B4F6C"),
	"fontFamilyBase": ("font-family-base", "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif"),
	"fontFamilySansSerif": ("font-family-sans-serif", "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif"),
	"primaryColor": ("primary", "#0B4F6C"),
	"secondaryColor": ("secondary", "#5B6B77"),
}

style_book = os.path.join(ROOT, "style-books/swell-lab")

write_json(
	os.path.join(style_book, "style-book.json"),
	{
		"defaultStyleBookEntry": True,
		"frontendTokensValuesPath": "frontend-tokens-values.json",
		"name": "Swell Lab",
		"themeId": "classic_WAR_classictheme",
	},
)
write_json(
	os.path.join(style_book, "frontend-tokens-values.json"),
	{name: {"cssVariableMapping": css, "value": value} for name, (css, value) in TOKENS.items()},
)

# Page banner: the instance does not run FreeMarker in fragments, so each page
# template sets the banner photo through the image editable instead

banner = os.path.join(ROOT, "fragments/swell-lab/sl-page-hero")

configuration = os.path.join(banner, "configuration.json")

if os.path.exists(configuration):
	os.remove(configuration)

with open(os.path.join(banner, "fragment.json")) as file:
	descriptor = json.load(file)

descriptor.pop("configurationPath", None)

write_json(os.path.join(banner, "fragment.json"), dict(sorted(descriptor.items())))

# Master page and page templates


def fragment(key, fields=None, images=None):
	definition = {"fragment": {"key": key}, "fragmentConfig": {}, "fragmentFields": []}

	for field_id, text in (fields or {}).items():
		definition["fragmentFields"].append({"id": field_id, "value": {"text": {"value_i18n": {"en_US": text}}}})

	for field_id, photo in (images or {}).items():
		definition["fragmentFields"].append(
			{
				"id": field_id,
				"value": {
					"fragmentImage": {
						"description": {"value_i18n": {"en_US": ""}},
						"url": {"value_i18n": {"en_US": f"/documents/d/guest/{photo}-jpg?download=true"}},
					}
				},
			}
		)

	return {"definition": definition, "type": "Fragment"}


def banner_fragment(title, text, photo):
	return fragment("sl-page-hero", {"text": text, "title": title}, {"image": photo})


write_json(
	os.path.join(ROOT, "master-pages/swell-lab/master-page.json"),
	{"name": "Swell Lab"},
)
write_json(
	os.path.join(ROOT, "master-pages/swell-lab/page-definition.json"),
	{
		"pageElement": {
			"pageElements": [
				fragment("sl-header"),
				{"definition": {"fragmentSettings": {"unallowedFragments": []}}, "type": "DropZone"},
				fragment("sl-footer"),
			],
			"type": "Root",
		},
		"settings": {
			"colorSchemeName": "01",
			"themeName": "Classic",
			"themeSettings": {
				"lfr-theme:regular:show-footer": "false",
				"lfr-theme:regular:show-header": "false",
				"lfr-theme:regular:show-header-search": "false",
				"lfr-theme:regular:wrap-widget-page-content": "false",
			},
		},
	},
)

TEMPLATES = {
	"swell-lab-book": (
		"Swell Lab Book",
		[
			banner_fragment("Book a lesson or a trip", "Pick a course or a trip and a date. We take care of the rest.", "surf-shack"),
			fragment("sl-booking-form"),
		],
	),
	"swell-lab-home": (
		"Swell Lab Home",
		[fragment("sl-hero"), fragment("sl-highlights"), fragment("sl-testimonials"), fragment("sl-cta")],
	),
	"swell-lab-lessons": (
		"Swell Lab Lessons",
		[
			banner_fragment("Surf lessons", "From your first pop-up to performance coaching, with a coach in the water every session.", "lesson-beginner"),
			fragment("sl-lessons"),
			fragment("sl-cta"),
		],
	),
	"swell-lab-spots": (
		"Swell Lab Spots",
		[
			banner_fragment("Local spots", "The breaks we surf every week, and when each one works best.", "spot-reef"),
			fragment("sl-spots"),
			fragment("sl-cta"),
		],
	),
	"swell-lab-trips": (
		"Swell Lab Trips",
		[
			banner_fragment("Surf trips", "A week of waves with lodging, transfers, and daily coaching.", "trip-bali"),
			fragment("sl-trips"),
			fragment("sl-cta"),
		],
	),
}

# The dashboard: LDP metric cards (a client extension) laid out with layout
# fragments. Fixed instance ids keep each card's Object entry key predictable.

METRIC_CARD_PORTLET = (
	"com_liferay_client_extension_web_internal_portlet_ClientExtensionEntryPortlet_"
	"26689402450212_52b9ea1e_eb7b_9cf2_96a4_3d964b3a548d"
)

VISITORS_BEHAVIOR_PORTLET = (
	"com_liferay_client_extension_web_internal_portlet_ClientExtensionEntryPortlet_"
	"26689402450212_e518ecf2_d2d7_b8b6_e580_97a62088fdf0"
)

DASHBOARD_ROWS = [
	[(12, "behavior", VISITORS_BEHAVIOR_PORTLET)],
	[(4, "visitors"), (4, "sessions"), (4, "bouncerate")],
	[(7, "toppages"), (5, "acquisition")],
	[(7, "heatmap"), (5, "devices")],
]


def metric_card(instance_id, portlet=METRIC_CARD_PORTLET):
	return {
		"definition": {
			"widgetInstance": {
				"widgetConfig": {"portletSetupPortletDecoratorId": "barebone"},
				"widgetInstanceId": instance_id,
				"widgetName": portlet,
			}
		},
		"type": "Widget",
	}


def row(columns):
	return {
		"definition": {
			"gutters": True,
			"modulesPerRow": len(columns),
			"numberOfColumns": len(columns),
			"reverseOrder": False,
			"rowViewports": [
				{"id": "landscapeMobile", "rowViewportDefinition": {"modulesPerRow": 1}},
				{"id": "portraitMobile", "rowViewportDefinition": {"modulesPerRow": 1}},
				{"id": "tablet", "rowViewportDefinition": {"modulesPerRow": 1}},
			],
			"verticalAlignment": "top",
		},
		"pageElements": [
			{
				"definition": {
					"columnViewports": [
						{"columnViewportDefinition": {"size": 12}, "id": "landscapeMobile"},
						{"columnViewportDefinition": {"size": 12}, "id": "portraitMobile"},
						{"columnViewportDefinition": {"size": 12}, "id": "tablet"},
					],
					"size": size,
				},
				"pageElements": [metric_card(*column[1:])],
				"type": "Column",
			}
			for column in columns
			for size in [column[0]]
		],
		"type": "Row",
	}


TEMPLATES["swell-lab-dashboard"] = (
	"Swell Lab Dashboard",
	[
		fragment("sl-dashboard-header"),
		{
			"definition": {
				"cssClasses": ["sl-dashboard"],
				"layout": {"widthType": "Fixed"},
			},
			"pageElements": [row(columns) for columns in DASHBOARD_ROWS],
			"type": "Section",
		},
	],
)

TEMPLATES["swell-lab-learn"] = (
	"Swell Lab Learn",
	[
		banner_fragment("Surf Academy", "Guides from our coaches to help you surf better, on land and in the water.", "spot-sunset-beach"),
		fragment("sl-academy"),
		fragment("sl-cta"),
	],
)

# The blog: posts written in the Swell Lab CMS space (CMS 2.0), listed with a
# collection display. Mapped fields make DXP emit the object entry analytics
# attributes, so LDP counts an impression for every post shown.

CMS_BLOG_CLASS_NAME = "com.liferay.object.model.ObjectDefinition#Y8H4"


def mapped(field_id, field_key, source="CollectionItem"):
	return {
		"id": field_id,
		"value": {
			"fragmentLink": {},
			"text": {"mapping": {"fieldKey": field_key, "itemReference": {"contextSource": source}}},
		},
	}


def mapped_link(field_id, text):
	return {
		"id": field_id,
		"value": {
			"fragmentLink": {
				"value": {
					"href": {"mapping": {"fieldKey": "displayPageURL", "itemReference": {"contextSource": "CollectionItem"}}}
				}
			},
			"text": {"value_i18n": {"en_US": text}},
		},
	}


NEXT_POSTS_PORTLET = (
	"com_liferay_client_extension_web_internal_portlet_ClientExtensionEntryPortlet_"
	"26689402450212_bfadcef5_f845_f95c_105a_8021e6005735"
)


TEMPLATES["swell-lab-blog"] = (
	"Swell Lab Blog",
	[
		banner_fragment("Surf Journal", "Stories, tips, and guides from our coaches.", "surf-shack"),
		{
			"definition": {"cssClasses": ["sl-blog-list"], "layout": {"widthType": "Fixed"}},
			"pageElements": [
				{
					"definition": {
						"collectionConfig": {
							"collectionReference": {"className": CMS_BLOG_CLASS_NAME},
							"collectionType": "CollectionProvider",
						},
						"collectionViewports": [
							{"collectionViewportDefinition": {"numberOfColumns": 1}, "id": "landscapeMobile"},
							{"collectionViewportDefinition": {"numberOfColumns": 1}, "id": "portraitMobile"},
							{"collectionViewportDefinition": {"numberOfColumns": 2}, "id": "tablet"},
						],
						"displayAllItems": False,
						"displayAllPages": True,
						"listItemStyle": "",
						"listStyle": "",
						"numberOfColumns": 3,
						"numberOfItems": 12,
						"numberOfItemsPerPage": 12,
						"numberOfPages": 1,
						"paginationType": "None",
						"showAllItems": False,
						"templateKey": "",
					},
					"pageElements": [
						{
							"definition": {"collectionItemConfig": {}},
							"pageElements": [
								{
									"definition": {
										"fragment": {"key": "sl-blog-card"},
										"fragmentConfig": {},
										"fragmentFields": [
											mapped("title", "ObjectField_title"),
											mapped("subtitle", "ObjectField_subtitle"),
											mapped_link("link", "Read the post →"),
										],
									},
									"type": "Fragment",
								}
							],
							"type": "CollectionItem",
						}
					],
					"type": "Collection",
				}
			],
			"type": "Section",
		},
		{
			"definition": {"cssClasses": ["sl-blog-next"], "layout": {"widthType": "Fixed"}},
			"pageElements": [metric_card("nextposts", NEXT_POSTS_PORTLET)],
			"type": "Section",
		},
		fragment("sl-cta"),
	],
)

# The page of each post: a display page template for the CMS blog structure

blog_post = os.path.join(ROOT, "display-page-templates/swell-lab-blog-post")

write_json(
	os.path.join(blog_post, "display-page-template.json"),
	{"contentType": {"className": CMS_BLOG_CLASS_NAME}, "defaultTemplate": True, "name": "Swell Lab Blog Post"},
)
write_json(
	os.path.join(blog_post, "page-definition.json"),
	{
		"pageElement": {
			"pageElements": [
				{
					"definition": {
						"fragment": {"key": "sl-page-hero"},
						"fragmentConfig": {},
						"fragmentFields": [
							mapped("title", "ObjectField_title", "DisplayPageItem"),
							mapped("text", "ObjectField_subtitle", "DisplayPageItem"),
							{
								"id": "image",
								"value": {
									"fragmentImage": {
										"description": {"value_i18n": {"en_US": ""}},
										"url": {"value_i18n": {"en_US": "/documents/d/guest/surf-shack-jpg?download=true"}},
									}
								},
							},
						],
					},
					"type": "Fragment",
				},
				{
					"definition": {
						"fragment": {"key": "sl-blog-post"},
						"fragmentConfig": {},
						"fragmentFields": [
							{
								"id": "content",
								"value": {
									"text": {
										"mapping": {
											"fieldKey": "ObjectField_content",
											"itemReference": {"contextSource": "DisplayPageItem"},
										}
									}
								},
							}
						],
					},
					"type": "Fragment",
				},
				fragment("sl-cta"),
			],
			"type": "Root",
		},
		"settings": {"masterPage": {"key": "swell-lab"}},
	},
)

collection = os.path.join(ROOT, "page-templates/swell-lab")

write_json(os.path.join(collection, "page-template-collection.json"), {"name": "Swell Lab"})

for key, (name, elements) in TEMPLATES.items():
	write_json(os.path.join(collection, key, "page-template.json"), {"name": name})
	write_json(
		os.path.join(collection, key, "page-definition.json"),
		{
			"pageElement": {"pageElements": elements, "type": "Root"},
			"settings": {"masterPage": {"key": "swell-lab"}},
		},
	)

# Utility pages

sign_in = os.path.join(ROOT, "utility-pages/layout-utility-page-template/SWELL-LAB-SIGN-IN")

write_json(
	os.path.join(sign_in, "utility-page.json"),
	{"externalReferenceCode": "SWELL-LAB-SIGN-IN", "name": "Swell Lab Sign In", "type": "Login"},
)
write_json(
	os.path.join(sign_in, "page-definition.json"),
	{
		"pageElement": {
			"pageElements": [
				{
					"definition": {"fragment": {"key": "sl-sign-in"}, "fragmentConfig": {}, "fragmentFields": []},
					"pageElements": [
						{
							"definition": {"fragmentDropZoneId": "form"},
							"pageElements": [
								{
									"definition": {
										"widgetInstance": {
											"widgetConfig": {"portletSetupPortletDecoratorId": "borderless"},
											"widgetName": "com_liferay_login_web_portlet_LoginPortlet",
										}
									},
									"type": "Widget",
								}
							],
							"type": "FragmentDropZone",
						}
					],
					"type": "Fragment",
				}
			],
			"type": "Root",
		},
		"settings": {"masterPage": {"key": "swell-lab"}},
	},
)

print("style book, master page,", len(TEMPLATES), "page templates, and 1 utility page")
