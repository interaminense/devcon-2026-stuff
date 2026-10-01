# LDP Widget Client Extension

A Custom Element client extension that charts LDP site metrics (visitors, sessions) through the DXP GraphQL proxy at `POST /o/analytics-rest/v1.0/graphql`. It needs no Liferay workspace: the code is served from any host and registered in the DXP UI.

## Run

1. Serve this folder:

	```bash
	python3 -m http.server 3333 --bind 127.0.0.1
	```

1. In DXP, go to *Applications → Client Extensions → New → Add Custom Element* and fill in:

	| Field | Value |
	|---|---|
	| Name | `LDP Visitors` |
	| HTML Element Name | `ldp-visitors` |
	| JavaScript URL | `http://localhost:3333/ldp-visitors.js` |
	| Instanceable | checked |

1. On a content page, drag *Client Extensions → LDP Visitors* onto the page as many times as needed and publish.

The DXP must be connected to LDP, and the page's site must belong to an LDP property (channel). The widget discovers the channel itself.

## Notes

- The script is loaded from another host but runs inside the DXP page, so calls to the proxy are same-origin and authenticated by the user's session plus `Liferay.authToken`.
- `client-extension.yaml` is the same definition expressed as code, for when this moves into a workspace. The UI registration does not use it.
- The metric and period chosen on each instance are not persisted yet.
