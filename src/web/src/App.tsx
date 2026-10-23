import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { setDisplayZone } from './format';
import { useMe } from './hooks';
import { AdminArchived, AdminAudit, AdminGroups, AdminJira, AdminPolicies, AdminSettings, AdminUsers, AdminRoles, AdminRights } from './pages/Admin';
import { CaseDetail, CaseForm, CaseList } from './pages/Cases';
import { ClientDetail, ClientForm, ClientList, ProjectList, RegionDetail } from './pages/Clients';
import { CommitmentDetail, CommitmentForm, CommitmentList } from './pages/Commitments';
import { EscalationDetail, EscalationForm, EscalationList } from './pages/Escalations';
import { NotesWorkspace } from './pages/Notes';
import { ConfigHome, ConfigListPage } from './pages/Configuration';
import { ContractDetail, ContractForm, ContractList, ProjectDetail } from './pages/Contracts';
import { ActionList } from './pages/Actions';
import { ClientMap, Dashboard } from './pages/Dashboard';
import { MicroserviceDetail, ProductDetail, ProductForm, ProductList } from './pages/Products';
import { ChangePasswordPage, LoginPage } from './pages/SignIn';
import { EnvironmentDetail, EnvironmentForm, EnvironmentList } from './pages/Environments';
import { AssetDetail, AssetList, ComponentDetail, InstallationDetail, VersionMatrix } from './pages/Inventory';
import { FirewallRuleList } from './pages/Firewall';
import { NotificationsPage } from './pages/Notifications';
import { DataQuality } from './pages/Quality';
import { Reports } from './pages/Reports';
import { HandoverDetail, HandoverList, ReassignmentQueue, TeamDetail, TeamList } from './pages/Teams';
import { ErrorBox, PageHead, StateMessage } from './ui/kit';
import { Shell } from './ui/Shell';

function Root() {
  const me = useMe();
  // Set during render (not in an effect) so pages opened directly already show and parse times in the user's zone.
  setDisplayZone(me.data?.timeZone);
  if (me.isLoading) return <div style={{ padding: 24 }}><StateMessage kind="loading" /></div>;
  if (me.data?.app.mustChangePassword) return <Navigate to="/account/password" replace />;
  if (me.error) return <div style={{ padding: 24 }}><ErrorBox error={me.error} /></div>;
  return <Shell><Outlet /></Shell>;
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
      { path: 'reports', element: <Reports /> },
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
