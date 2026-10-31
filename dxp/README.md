# Frozen DEVCON DXP

The demo runs on an official DXP release in Docker, never on a development bundle built from master. The image tag is pinned with its build date, so the DXP on stage is the same one the demo was rehearsed on.

| | |
|---|---|
| Image | `liferay/dxp:2026.q3.5-d10.0.88-20260924085907` |
| Container | `devcon-dxp` |
| URL | `http://devcon.localhost:8081` |
| Data | `~/dev/projects/devcon-2026/liferay-portal/data` |
| Deploy folder | `~/dev/projects/devcon-2026/liferay-portal/deploy` |

2026.Q3 is the latest release line that ships the DXP GraphQL proxy (`POST /o/analytics-rest/v1.0/graphql`, LPD-85945) without a feature flag. The 2026.Q1 LTS tags do not include it.

The data lives outside this repository. `DXP_HOME` overrides its location in both scripts.

## First Run

1. Pull the image ahead of time. It is several GB.

	```bash
	docker pull liferay/dxp:2026.q3.5-d10.0.88-20260924085907
	```

1. Create the container.

	```bash
	dxp/run.sh
	```

1. Wait for the boot to finish.

	```bash
	docker logs --follow devcon-dxp 2>&1 | grep --line-buffered "Server startup in"
	```

1. Open `http://devcon.localhost:8081` and sign in as `test@liferay.com` with password `test`. DXP asks for a new password on the first sign-in. If it asks for an activation key, copy the `.xml` file into the deploy folder.

## Connect to LDP

1. In LDP, go to *Settings → Data Sources*, add a *Liferay DXP* data source, and copy the connection token.

1. In DXP, go to *Control Panel → Instance Settings*, open the Analytics Cloud / Liferay Data Platform section, paste the token, and connect.

1. Assign the demo site to an LDP property. The widget discovers the property (channel) from the current site.

1. Check the proxy:

	```bash
	export DXP_PASSWORD=<password>
	export DXP_URL=http://devcon.localhost:8081
	export DXP_USER=test@liferay.com

	scripts/get-channels.sh
	```

	Until DXP is connected, the channels endpoint returns 400 and the proxy logs `Host name may not be null`.

## Register the Client Extension

1. Serve the widget:

	```bash
	cd client-extension

	python3 -m http.server 3333 --bind 127.0.0.1
	```

1. In DXP, go to *Applications → Client Extensions → New → Add Custom Element* and fill in:

	| Field | Value |
	|---|---|
	| Name | `LDP Visitors` |
	| HTML Element Name | `ldp-visitors` |
	| JavaScript URL | `http://localhost:3333/ldp-visitors.js` |
	| Instanceable | checked |

1. Create a blank content page, open *Widgets → Client Extensions*, drag *LDP Visitors* onto the page as many times as needed, and publish.

The script URL points at `localhost` even though DXP runs in a container: the browser loads the script, not the server.

The metric card (`client-extension-metric-card`) registers the same way, served on port 3334. See its README.

## Day to Day

```bash
docker start devcon-dxp
docker stop devcon-dxp
```

Do not run `dxp/run.sh` again to bring the DXP back: that creates a new container. Sessions are kept in memory, so every restart asks for a new sign-in; the data itself persists.

## Backup and Restore

Take a backup once everything is configured, and again before the talk.

```bash
dxp/backup.sh backup
dxp/backup.sh restore
```

Both commands stop the container while they run and start it again afterwards. The default file is `devcon-dxp-data.tgz` in `DXP_HOME`.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| The sign-in does not stick, and the console shows errors from menus and panels | Cookies ignore ports. On `localhost:8081`, the demo DXP shares its `JSESSIONID` with the development DXP on `localhost:8080`, and each one logs the other out. Requests then arrive as the guest user. | Always use `http://devcon.localhost:8081`. |
| `500` with `Invalid host name devcon.localhost` in the log | DXP accepts only `localhost`, `127.0.0.1` and `[::1]` by default. | The container needs `LIFERAY_VIRTUAL_PERIOD_HOSTS_PERIOD_VALID_PERIOD_HOSTS`, which `run.sh` sets. Recreate it with `run.sh`. |
| The container fails to write to `data` | Rootless Docker maps the container's `liferay` user to a subordinate host uid. | `run.sh` chowns the folders to uid 1000 from inside a container. Repeat that step if the folders were recreated by hand. |
| The page editor breaks after clicking the *+* next to a widget | A page editor bug in this release (React `removeChild` error). | Reload the editor and drag the widget instead. |
| The widget shows `channels?pageSize=200 returned 400` | DXP is not connected to LDP. | See [Connect to LDP](#connect-to-ldp). |

## Offline Rehearsal

The `devcon-demo` site on this DXP mirrors the stage setup without internet. The **DEVCON Offline** fragment set has an *Offline Mode* fragment (`demo/offline/fragments`) that answers the LDP GraphQL proxy and the AI Hub calls with fake data, so the demo card code stays the same as on stage. Drop it at the top of a page, above the cards.

What is already in place:

- The *Insight Alert* object (`/o/c/insightalerts`), its *Notify marketing team* action and the *DEVCON 2026 Insight Alert* notification template.
- The *Marketing Team* role with *Access in Control Panel* and *View* on Insight Alerts and *View Control Panel Menu*.
- The user `bruna.marketing@liferay.com` (password `test`) in that role.
- The *Offline Test* page (template *Offline Rehearsal Test*), with Offline Mode and two finished cards, to check the setup.

"Require strangers to verify their email address" is off in Instance Settings, so new users can sign in without a mail server.

The rehearsal guide is `demo/live-guide/devcon-live-demo-offline.html` (`python3 build.py offline`). Open it straight from disk: it needs no network.
