# Users, roles and rights: administrator guide

Everything is under **Administration**. People hold roles, roles hold rights, and rights decide what a person can do. **Data scope** (which clients, projects and teams) is set separately and decides which records those rights reach.

## Users

**Administration → Users** lists every account with its roles, active state and last sign-in. "Last sign-in" is when the account last signed in, not when it was last active.

- **Create:** choose **+ New User**, enter the account name, display name and time zone, then tick roles and set data scope. The account name can't be changed later. In Forms mode you then issue a temporary password.
- **Roles:** tick as many as apply, and their rights combine. Roles shown as *from directory* come from a directory group and are changed under Group mappings.
- **A user with no role** is allowed. They can still get access through a directory group or an individual exception.
- **Deactivate** keeps the account and its history and ends access at once. Open records go to the reassignment queue; nothing is reassigned automatically.
- **Delete** works only if nothing refers to the account. Otherwise deactivate it.

You can't change your own roles or scope, deactivate or delete yourself, or grant more than you hold. The last administrator can't be removed.

## Roles

**Administration → Roles** lists each role and who holds it, and compares what roles can do.

- **New role:** starts with no rights. You are taken to the Rights page to assign them.
- **Clone:** copies a role's rights. Review them before you assign the role.
- **Inactive:** the role gives nobody any rights, but its assignments stay.
- **Delete:** only if no person and no directory group uses it.
- **TIO Manager** is protected and always holds every right. Clone it to make a role you can change.
- **Compare roles** shows how many rights of each feature every role holds, even when the feature is collapsed. **Only where roles differ** hides the rest, leaving out the protected role because it holds everything.

## Rights

**Administration → Rights** shows the catalog and what a chosen role holds. The application defines the catalog, so rights can't be added or renamed here.

- **Access** rights open a feature. **Action** rights allow something in it, such as create, edit or delete.
- Some rights need others. `Cases:Maintain` needs `Cases:View`. If one is missing the right doesn't work, and the page warns you and offers **Add the missing prerequisites**.
- **Platform-wide controls** are Administration, Export files, Technical detail and Change history. For example, a module's Export right works only together with Export files.
- **Grid** shows each module as a table, with one row per feature and one column per action. Hover over a box to read what the right allows. ▲ marks a sensitive right, ! a missing prerequisite, and ● a staged change.
- **List** shows the same rights with their keys, descriptions and prerequisites, and can add the prerequisites of one right. The page remembers your choice in this browser.
- **Compare with role** shows what another role has. In the grid, a mark sits below each box and an underline shows where the two differ. The search and comparison stay in place when you move to another role.
- **Show them** lists the rights that are missing a prerequisite. **Grant all shown** and **Revoke all shown** act only on what the filters show, and ask you to confirm.
- Changes are staged. Choose **Review and save**, check the list, and save. The review groups changes by module, lists sensitive rights first, and warns about any right the save would leave without a prerequisite. Changes apply to signed-in people on their next request.

## Directory group mappings (Windows mode)

**Administration → Group mappings** gives members of a directory group roles and data scope when they sign in. You can't change a mapping for a group you belong to, and changing a mapping's roles requires holding every active right, because the members can't be checked in advance.

## Access review

**Administration → Access review** answers "why can or can't this person do this?"

- **A person's effective rights:** the rights the server resolves for them, and which role gave each one.
- **Check access:** tests one right, optionally for one client, project or team. It runs nothing, and a pass doesn't promise the operation will succeed, because ownership and workflow also apply.
- **Individual exceptions:** allow or deny one right for one person, optionally until a date. A deny always wins. Three rights can be limited to one client, project or team. Use these sparingly: a role is easier to review.
- **Incompatible roles:** pairs of roles nobody may hold together.

Every change is recorded in **Change history** under the Access category.

## How the final answer is worked out

1. An inactive account or conflicting roles means no access.
2. Rights from all active roles are combined, direct and from directory groups.
3. Individual allows are added and denies removed. Accounts with Administration ignore allows.
4. A right whose prerequisites aren't all present doesn't count.
5. Data scope, ownership and workflow then apply to the specific record.
