import { lazy, Suspense, type ComponentType } from 'react';
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router';
import { setDisplayZone } from './format';
import { useMe } from './hooks';
import { ChangePasswordPage, LoginPage } from './pages/SignIn';
import { ErrorBox, PageHead, StateMessage } from './ui/kit';
import { Shell } from './ui/Shell';

// GUI-13: pages load with their route (one chunk per page module), so the first screen does not download every page. The shell
// stays in place while a page loads; in-app navigation keeps the previous page until the next one is ready (router transitions).
function page<M, K extends keyof M & string>(load: () => Promise<M>, name: K) {
  return lazy(() => load().then(m => ({ default: m[name] as ComponentType })));
}
const AdminArchived = page(() => import('./pages/Admin'), 'AdminArchived');
const AdminAudit = page(() => import('./pages/Admin'), 'AdminAudit');
const AdminGroups = page(() => import('./pages/Admin'), 'AdminGroups');
const AdminJira = page(() => import('./pages/Admin'), 'AdminJira');
const AdminPolicies = page(() => import('./pages/Admin'), 'AdminPolicies');
const AdminSettings = page(() => import('./pages/Admin'), 'AdminSettings');
const AdminUsers = page(() => import('./pages/Admin'), 'AdminUsers');
const AdminRoles = page(() => import('./pages/Admin'), 'AdminRoles');
const AdminRights = page(() => import('./pages/Admin'), 'AdminRights');
const CaseDetail = page(() => import('./pages/Cases'), 'CaseDetail');
const CaseForm = page(() => import('./pages/Cases'), 'CaseForm');
const CaseList = page(() => import('./pages/Cases'), 'CaseList');
const ClientDetail = page(() => import('./pages/Clients'), 'ClientDetail');
const ClientForm = page(() => import('./pages/Clients'), 'ClientForm');
const ClientList = page(() => import('./pages/Clients'), 'ClientList');
const ProjectList = page(() => import('./pages/Clients'), 'ProjectList');
const RegionDetail = page(() => import('./pages/Clients'), 'RegionDetail');
const CommitmentDetail = page(() => import('./pages/Commitments'), 'CommitmentDetail');
const CommitmentForm = page(() => import('./pages/Commitments'), 'CommitmentForm');
const CommitmentList = page(() => import('./pages/Commitments'), 'CommitmentList');
const EscalationDetail = page(() => import('./pages/Escalations'), 'EscalationDetail');
const EscalationForm = page(() => import('./pages/Escalations'), 'EscalationForm');
const EscalationList = page(() => import('./pages/Escalations'), 'EscalationList');
const NotesWorkspace = page(() => import('./pages/Notes'), 'NotesWorkspace');
const ConfigHome = page(() => import('./pages/Configuration'), 'ConfigHome');
const ConfigListPage = page(() => import('./pages/Configuration'), 'ConfigListPage');
const ContractDetail = page(() => import('./pages/Contracts'), 'ContractDetail');
const ContractForm = page(() => import('./pages/Contracts'), 'ContractForm');
const ContractList = page(() => import('./pages/Contracts'), 'ContractList');
const ProjectDetail = page(() => import('./pages/Contracts'), 'ProjectDetail');
const ActionList = page(() => import('./pages/Actions'), 'ActionList');
const ClientMap = page(() => import('./pages/Dashboard'), 'ClientMap');
const Dashboard = page(() => import('./pages/Dashboard'), 'Dashboard');
const MicroserviceDetail = page(() => import('./pages/Products'), 'MicroserviceDetail');
const ProductDetail = page(() => import('./pages/Products'), 'ProductDetail');
const ProductForm = page(() => import('./pages/Products'), 'ProductForm');
const ProductList = page(() => import('./pages/Products'), 'ProductList');
const EnvironmentDetail = page(() => import('./pages/Environments'), 'EnvironmentDetail');
const EnvironmentForm = page(() => import('./pages/Environments'), 'EnvironmentForm');
const EnvironmentList = page(() => import('./pages/Environments'), 'EnvironmentList');
const AssetDetail = page(() => import('./pages/Inventory'), 'AssetDetail');
const AssetList = page(() => import('./pages/Inventory'), 'AssetList');
const ComponentDetail = page(() => import('./pages/Inventory'), 'ComponentDetail');
const InstallationDetail = page(() => import('./pages/Inventory'), 'InstallationDetail');
const VersionMatrix = page(() => import('./pages/Inventory'), 'VersionMatrix');
const FirewallRuleList = page(() => import('./pages/Firewall'), 'FirewallRuleList');
const NotificationsPage = page(() => import('./pages/Notifications'), 'NotificationsPage');
const DataQuality = page(() => import('./pages/Quality'), 'DataQuality');
const Reports = page(() => import('./pages/Reports'), 'Reports');
const HandoverDetail = page(() => import('./pages/Teams'), 'HandoverDetail');
const HandoverList = page(() => import('./pages/Teams'), 'HandoverList');
const ReassignmentQueue = page(() => import('./pages/Teams'), 'ReassignmentQueue');
const TeamDetail = page(() => import('./pages/Teams'), 'TeamDetail');
const TeamList = page(() => import('./pages/Teams'), 'TeamList');

function Root() {
  const me = useMe();
  // Set during render (not in an effect) so pages opened directly already show and parse times in the user's zone.
  setDisplayZone(me.data?.timeZone);
  if (me.isLoading) return <div style={{ padding: 24 }}><StateMessage kind="loading" /></div>;
  if (me.data?.app.mustChangePassword) return <Navigate to="/account/password" replace />;
  if (me.error) return <div style={{ padding: 24 }}><ErrorBox error={me.error} /></div>;
  return <Shell><Suspense fallback={<StateMessage kind="loading" />}><Outlet /></Suspense></Shell>;
}

function Home() {
  const me = useMe().data!;
  if (!me.businessRole) return me.isAdministrator ? <Navigate to="/admin/users" replace /> : <NoAccess />;
  return <Dashboard />;
}

function MapHome() {
  const me = useMe().data!;
  if (!me.businessRole) return me.isAdministrator ? <Navigate to="/admin/users" replace /> : <NoAccess />;
  return <ClientMap />;
}

function NoAccess() {
  return (<>
    <PageHead title="No business access" />
    <StateMessage kind="restricted">Your account has no business role or scope, so client and internal records are not shown. Ask an Application Administrator.</StateMessage>
  </>);
}

/**
 * GUI-01: the Reporting Center lives at /reporting-center. On a server where SQL Server Reporting Services holds the http.sys URL
 * reservation http://+:80/Reports/ (the default SSRS web portal), every full page load of /reports - typing it, refreshing, a bookmark,
 * a notification link opened in a new tab - is answered by the SSRS Report Manager, not by the hub. Old in-app links still work.
 */
function LegacyReports() {
  const loc = useLocation();
  return <Navigate to={`/reporting-center${loc.pathname.replace(/^\/reports/, '')}${loc.search}`} replace />;
}

function NotFound() {
  return (<><PageHead title="Page not found" /><StateMessage kind="none">There is no page at this address.</StateMessage></>);
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/account/password', element: <ChangePasswordPage /> },
  {
    path: '/', element: <Root />, children: [
      { index: true, element: <Home /> },
      { path: 'map', element: <MapHome /> },
      { path: 'actions', element: <ActionList /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'data-quality', element: <DataQuality /> },
      // A70: the center's areas are sub-routes (overview, library, builder, my reports, schedules, history, templates).
      { path: 'reporting-center/*', element: <Reports /> },
      { path: 'reports', element: <LegacyReports /> },
      { path: 'reports/*', element: <LegacyReports /> },
      { path: 'clients', element: <ClientList /> },
      { path: 'clients/new', element: <ClientForm /> },
      { path: 'clients/:id', element: <ClientDetail /> },
      { path: 'clients/:id/edit', element: <ClientForm /> },
      { path: 'regions/:id', element: <RegionDetail /> },
      { path: 'projects', element: <ProjectList /> },
      { path: 'projects/:id', element: <ProjectDetail /> },
      { path: 'products', element: <ProductList /> },
      { path: 'products/new', element: <ProductForm /> },
      { path: 'products/:id', element: <ProductDetail /> },
      { path: 'products/:id/edit', element: <ProductForm /> },
      { path: 'microservices/:id', element: <MicroserviceDetail /> },
      { path: 'contracts', element: <ContractList /> },
      { path: 'contracts/new', element: <ContractForm /> },
      { path: 'contracts/:id', element: <ContractDetail /> },
      { path: 'contracts/:id/edit', element: <ContractForm /> },
      { path: 'environments', element: <EnvironmentList /> },
      { path: 'environments/new', element: <EnvironmentForm /> },
      { path: 'environments/:id', element: <EnvironmentDetail /> },
      { path: 'environments/:id/edit', element: <EnvironmentForm /> },
      { path: 'installations/:id', element: <InstallationDetail /> },
      { path: 'components/:id', element: <ComponentDetail /> },
      { path: 'versions', element: <VersionMatrix /> },
      { path: 'assets', element: <AssetList /> },
      { path: 'assets/:id', element: <AssetDetail /> },
      { path: 'firewall-rules', element: <FirewallRuleList /> },
      { path: 'cases', element: <CaseList /> },
      { path: 'cases/new', element: <CaseForm /> },
      { path: 'cases/:id', element: <CaseDetail /> },
      { path: 'cases/:id/edit', element: <CaseForm /> },
      { path: 'commitments', element: <CommitmentList /> },
      { path: 'commitments/new', element: <CommitmentForm /> },
      { path: 'commitments/:id', element: <CommitmentDetail /> },
      { path: 'notes', element: <NotesWorkspace /> },
      { path: 'escalations', element: <EscalationList /> },
      { path: 'escalations/new', element: <EscalationForm /> },
      { path: 'escalations/:id', element: <EscalationDetail /> },
      { path: 'escalations/:id/edit', element: <EscalationForm /> },
      { path: 'teams', element: <TeamList /> },
      { path: 'teams/:id', element: <TeamDetail /> },
      { path: 'handovers', element: <HandoverList /> },
      { path: 'handovers/:id', element: <HandoverDetail /> },
      { path: 'reassignment', element: <ReassignmentQueue /> },
      { path: 'admin', element: <Navigate to="/admin/users" replace /> },
      { path: 'admin/users', element: <AdminUsers /> },
      { path: 'admin/groups', element: <AdminGroups /> },
      // A34: one page per configuration list; the old single page and the zones link point to it.
      { path: 'admin/config', element: <ConfigHome /> },
      { path: 'admin/config/:slug', element: <ConfigListPage /> },
      { path: 'admin/reference', element: <Navigate to="/admin/config" replace /> },
      { path: 'admin/network-zones', element: <Navigate to="/admin/config/network-zones" replace /> },
      { path: 'admin/roles', element: <AdminRoles /> },
      { path: 'admin/rights', element: <AdminRights /> },
      { path: 'admin/products', element: <Navigate to="/products" replace /> },
      { path: 'admin/policies', element: <AdminPolicies /> },
      { path: 'admin/jira', element: <AdminJira /> },
      { path: 'admin/settings', element: <AdminSettings /> },
      { path: 'admin/audit', element: <AdminAudit /> },
      { path: 'admin/archived', element: <AdminArchived /> },
      { path: '*', element: <NotFound /> }
    ]
  }
]);
