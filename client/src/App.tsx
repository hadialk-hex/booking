import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import Home from "./pages/Home";
import SetupName from "./pages/SetupName";
import PendingApproval from "./pages/PendingApproval";
import AdminDashboard from "./pages/AdminDashboard";
import AdminDoctors from "./pages/AdminDoctors";
import AdminUsers from "./pages/AdminUsers";
import AdminAppointments from "./pages/AdminAppointments";
import AdminBookingSources from "./pages/AdminBookingSources";
import CallCenterDashboard from "./pages/CallCenterDashboard";
import ReceptionDashboard from "./pages/ReceptionDashboard";
import AppointmentSchedule from "./pages/AppointmentSchedule";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/setup-name"} component={SetupName} />
      <Route path={"/pending-approval"} component={PendingApproval} />
      <Route path={"/admin"} component={AdminDashboard} />
      <Route path={"/admin/doctors"} component={AdminDoctors} />
      <Route path={"/admin/users"} component={AdminUsers} />
      <Route path={"/admin/appointments"} component={AdminAppointments} />
      <Route path={"/admin/booking-sources"} component={AdminBookingSources} />
      <Route path={"/call-center"} component={CallCenterDashboard} />
      <Route path={"/reception"} component={ReceptionDashboard} />
      <Route path={"/schedule"} component={AppointmentSchedule} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
