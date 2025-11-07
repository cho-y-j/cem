import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Equipment from "./pages/Equipment";
import Workers from "./pages/Workers";
import Documents from "./pages/Documents";
import WorkJournal from "./pages/WorkJournal";
import AdminUsers from "./pages/admin/Users";
import AdminEquipTypes from "./pages/admin/EquipTypes";
import AdminWorkerTypes from "./pages/admin/WorkerTypes";
import AdminCompanies from "./pages/admin/Companies";
import AdminUsersNew from "./pages/admin/UsersNew";
import SafetyTemplates from "./pages/admin/SafetyTemplates";
import SafetyTemplateDetail from "./pages/admin/SafetyTemplateDetail";
import SafetyTemplateNew from "./pages/admin/SafetyTemplateNew";
import SafetyTemplateEdit from "./pages/admin/SafetyTemplateEdit";
import SafetyInspections from "./pages/admin/SafetyInspections";
import DriverInspectionTemplates from "./pages/admin/DriverInspectionTemplates";
import DriverInspectionTemplateNew from "./pages/admin/DriverInspectionTemplateNew";
import DriverInspectionTemplateDetail from "./pages/admin/DriverInspectionTemplateDetail";
import DriverInspectionTemplateEdit from "./pages/admin/DriverInspectionTemplateEdit";
import SafetyInspectionReview from "./pages/SafetyInspectionReview";
import Approvals from "./pages/Approvals";
import EntryRequests from "./pages/EntryRequests";
import EntryRequestsNew from "./pages/EntryRequestsNew";
import Deployments from "./pages/Deployments";
import Statistics from "./pages/Statistics";
import WorkerMobile from "./pages/mobile/WorkerMobile";
import DocumentUpload from "./pages/mobile/DocumentUpload";
import InspectionLog from "./pages/mobile/InspectionLog";
import WorkLog from "./pages/mobile/WorkLog";
import WorkJournalList from "./pages/mobile/WorkJournalList";
import WorkerMain from "./pages/mobile/WorkerMain";
import InspectorMain from "./pages/mobile/InspectorMain";
import SafetyInspectionNew from "./pages/mobile/SafetyInspectionNew";
import SafetyInspectionHistory from "./pages/mobile/SafetyInspectionHistory";
import PinLogin from "./pages/mobile/PinLogin";
import InspectorLogin from "./pages/mobile/InspectorLogin";
import DriverInspection from "./pages/mobile/DriverInspection";
import DriverInspectionPerform from "./pages/mobile/DriverInspectionPerform";
import DriverInspectionHistory from "./pages/mobile/DriverInspectionHistory";
import EntryRequestCreate from "./pages/EntryRequestCreate";
import EntryRequestBpApprove from "./pages/EntryRequestBpApprove";
import EntryRequestEpApprove from "./pages/EntryRequestEpApprove";
import LocationTracking from "./pages/LocationTracking";
import EmergencyAlerts from "./pages/EmergencyAlerts";
import WorkMonitoring from "./pages/WorkMonitoring";
import Login from "./pages/Login";
import MyProfile from "./pages/MyProfile";
import MobileMyProfile from "./pages/mobile/MyProfile";
import MobileLoginNew from "./pages/mobile/LoginNew";
import MobileLoginCompare from "./pages/mobile/LoginCompare";

function Router() {
  return (
    <Switch>
      {/* 로그인 페이지 (레이아웃 없음) */}
      <Route path="/login" component={Login} />
      <Route path="/mobile/login" component={PinLogin} />
      <Route path="/mobile/login-new" component={MobileLoginNew} />
      <Route path="/mobile/login-compare" component={MobileLoginCompare} />
      <Route path="/mobile/inspector/login" component={InspectorLogin} />
      
      {/* 나머지 페이지 (DashboardLayout으로 감싸기) */}
      <Route>
        <DashboardLayout>
          <Switch>
            <Route path="/" component={Home} />
        <Route path="/equipment" component={Equipment} />
        <Route path="/workers" component={Workers} />
        <Route path="/documents" component={Documents} />
        <Route path="/work-journal" component={WorkJournal} />
        <Route path="/approvals" component={Approvals} />
        <Route path="/entry-requests" component={EntryRequestsNew} />
        <Route path="/entry-requests/new" component={EntryRequestCreate} />
        <Route path="/entry-requests/:id/bp-approve" component={EntryRequestBpApprove} />
        <Route path="/entry-requests/:id/ep-approve" component={EntryRequestEpApprove} />
        <Route path="/entry-requests-old" component={EntryRequests} />
        <Route path="/deployments" component={Deployments} />
        <Route path="/statistics" component={Statistics} />
        <Route path="/location-tracking" component={LocationTracking} />
        <Route path="/emergency-alerts" component={EmergencyAlerts} />
        <Route path="/work-monitoring" component={WorkMonitoring} />
        <Route path="/my-profile" component={MyProfile} />

        <Route path="/mobile/worker" component={WorkerMain} />
        <Route path="/mobile/profile" component={MobileMyProfile} />
        <Route path="/mobile/inspector" component={InspectorMain} />
        <Route path="/mobile/inspector/inspection/:equipmentId" component={SafetyInspectionNew} />
        <Route path="/mobile/inspector/history" component={SafetyInspectionHistory} />
        <Route path="/mobile/worker-old" component={WorkerMobile} />
        <Route path="/mobile/document-upload" component={DocumentUpload} />
        <Route path="/mobile/inspection-log" component={InspectionLog} />
        <Route path="/mobile/work-log" component={WorkLog} />
        <Route path="/mobile/work-journal-list" component={WorkJournalList} />
        <Route path="/mobile/driver-inspection" component={DriverInspection} />
        <Route path="/mobile/driver-inspection/:id/perform" component={DriverInspectionPerform} />
        <Route path="/mobile/driver-inspection/history" component={DriverInspectionHistory} />
        <Route path="/admin/users" component={AdminUsersNew} />
        <Route path="/admin/users-old" component={AdminUsers} />
        <Route path="/admin/companies" component={AdminCompanies} />
        <Route path="/admin/equip-types" component={AdminEquipTypes} />
        <Route path="/admin/worker-types" component={AdminWorkerTypes} />
        <Route path="/admin/safety-templates" component={SafetyTemplates} />
        <Route path="/admin/safety-templates/new" component={SafetyTemplateNew} />
        <Route path="/admin/driver-templates" component={DriverInspectionTemplates} />
        <Route path="/admin/driver-templates/new" component={DriverInspectionTemplateNew} />
        <Route path="/admin/driver-templates/:id/edit" component={DriverInspectionTemplateEdit} />
        <Route path="/admin/driver-templates/:id" component={DriverInspectionTemplateDetail} />
        <Route path="/admin/safety-templates/:id/edit" component={SafetyTemplateEdit} />
        <Route path="/admin/safety-templates/:id" component={SafetyTemplateDetail} />
        <Route path="/admin/safety-inspections" component={SafetyInspections} />
        <Route path="/safety-inspection-review" component={SafetyInspectionReview} />
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </DashboardLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

