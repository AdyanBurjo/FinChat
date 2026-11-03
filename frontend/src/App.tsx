import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Transactions from "./pages/Transactions";
import Categories from "./pages/Categories";
import Wallets from "./pages/Wallets";
import Budgets from "./pages/Budgets";
import Insights from "./pages/Insights";
import Debts from "./pages/Debts";
import FinancialCalendar from "./pages/FinancialCalendar";
import Recurring from "./pages/Recurring";
import SavingsGoals from "./pages/SavingsGoals";
import PaydayPlanner from "./pages/PaydayPlanner";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/layout/DashboardLayout";
import Chat from "./pages/Chat";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>

            <Route path="/" element={<Dashboard />} />

            <Route
              path="/transactions"
              element={<Transactions />}
            />

            <Route
              path="/wallets"
              element={<Wallets />}
            />

            <Route
              path="/budgets"
              element={<Budgets />}
            />

            <Route
              path="/insights"
              element={<Insights />}
            />

            <Route
              path="/debts"
              element={<Debts />}
            />

            <Route
              path="/calendar"
              element={<FinancialCalendar />}
            />

            <Route
              path="/recurring"
              element={<Recurring />}
            />

            <Route
              path="/savings-goals"
              element={<SavingsGoals />}
            />

            <Route
              path="/payday"
              element={<PaydayPlanner />}
            />

            <Route
              path="/categories"
              element={<Categories />}
            />

            <Route
              path="/chat"
              element={<Chat />}
            />

          </Route>
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;