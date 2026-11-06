# TIO Operations Hub 2.56.0

Prepared 6 November 2026. See [TEST-RESULTS.md](TEST-RESULTS.md) for what was run. Upgrading from before 2.55.0? Read the earlier notes as well: 2.54.1 and 2.52.0 have database changes, and 2.54.0 changes priorities and SLA targets.

## A server records its IP address, VLAN and notes (A104)

- **New fields.** A server's form and page have an IP address, a VLAN and free notes, for example its purpose, network speed, GPU memory or software prerequisites.
- **Server lists.** The servers list and the server list on an environment page show the IP address.
- **Technical detail.** Like the network zone, people without the Technical detail right see none of these, cannot set them, and keep what is recorded when they edit a server.
- **Checked.** An IP address must be complete and valid, for example 10.50.13.60. IPv6 is accepted.
- **Copying a server** to another environment keeps its notes but not its address or VLAN, which differ per environment.
- **Not yet in reports.** Reports and exports do not include the new fields.

## Upgrade

1. Back up the database.
2. Apply `database\01-schema.sql`. From 2.55.0 it only adds three nullable columns to `inventory.Asset` (migration `AssetNetworkDetails`) and changes no data.
3. Deploy the application.

Going back to 2.55.0 needs no database change: the earlier application ignores the new columns.

## Sewar infrastructure (separate script)

`load-sewar-infrastructure.sql` loads the Sewar Tech servers, volumes, F5 virtual servers and firewall rules from the client's hardware sheet (KU105375 V2.7). It holds client network addresses, so it is not in this package or the repository: it is handed over separately. Run it only after step 2. It reports and rolls back by default; read its header before applying it.
