# TIO-DEV-AUDIT-009 — Missing uniqueness rules: contract reference, client name, firewall rule

| Field | Value |
|---|---|
| Module | Contracts, Clients, Firewall rules |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.29.0, commit 26b7cf8) |
| Page URL | /contracts/new, /clients/new, /firewall-rules |
| Category | Data integrity defect |
| Priority | P2 |
| Status | Confirmed |
| Suggested Owner | Development |

## Business Impact

Two Active contracts with the same contract number in one project, two clients with the same name, and identical firewall rules can coexist. Search, reports and SLA linking become ambiguous.

## User Impact

Users pick the wrong contract when linking a case; duplicates accumulate.

## Preconditions

Existing contract with a reference; existing client; existing rule.

## Steps to Reproduce

1. POST the same contract twice.
2. Create a client with an existing name and a new alias.
3. POST the same firewall rule twice.

## Expected Result

409 with the conflicting record named (as for client alias, environment, server and installation names).

## Actual Result

201 in all three cases.

## Evidence

traces/api-test-evidence.jsonl (tc CON-05, CLI-05, FW-05); test TIO-DEV-AUDIT-009.

## Root Cause

No unique rule/index on Contract.ContractReference per client, Client.Name, or (source, destination, ports, protocol).

## Recommended Fix

Add unique checks (and database indexes) or at least a duplicate warning such as GET /clients/duplicates already offers for clients.

## Acceptance Criteria

A second contract with the same non-empty reference for the same client returns 409.

## Regression Test

TIO-DEV-AUDIT-009
