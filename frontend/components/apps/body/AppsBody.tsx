import React from "react";
import {
  Student,
  Coach,
  Invoice,
  ScheduleSession,
  AttendanceRecord,
  AdminNotification,
} from "../types";
import DashboardOverviewTab from "./DashboardOverviewTab";
import KeuanganTab from "./KeuanganTab";
import DaftarHadirTab from "./DaftarHadirTab";
import AbsensiTab from "./AbsensiTab";
import RegistrasiTab from "./RegistrasiTab";
import JadwalTab from "./JadwalTab";
import ProfilTab from "./ProfilTab";
import PelatihTab from "./PelatihTab";
import PullToRefresh from "../PullToRefresh";

interface AppsBodyProps {
  activeTab: string;
  setActiveTab?: (tab: string) => void;
  sessionUser: string;
  sessionRole: string;
  students: Student[];
  coaches: Coach[];
  invoices: Invoice[];
  schedules: ScheduleSession[];
  attendances?: AttendanceRecord[];
  notifications?: AdminNotification[];
  showInstallBtn?: boolean;
  onInstallClick?: () => void;
  onLogout?: () => void;
  onRefresh?: () => Promise<void>;
  onAddSchedule: (data: Omit<ScheduleSession, "id">) => void;
  onUpdateSchedule?: (id: string, data: Partial<ScheduleSession>) => void;
  onDeleteSchedule: (id: string) => void;
  onVerifyPayment: (invoiceId: string, confirm: boolean) => void;
  onCheckInAttendance?: (payload: any) => Promise<boolean | void>;
  onMarkNotificationRead?: (id: number | string) => Promise<void>;
  onSubmitAttendance: (
    className: string,
    attendanceMap: Record<string, "Hadir" | "Sakit" | "Izin" | "Alpa">
  ) => void;
  onAddStudent: (data: {
    name: string;
    age: string;
    parent: string;
    phone: string;
    class: string;
  }) => void;
  onAddCoach: (data: {
    name: string;
    spec: string;
    phone: string;
    email: string;
    class: string;
  }) => void;
}

export default function AppsBody({
  activeTab,
  setActiveTab,
  sessionUser,
  sessionRole,
  students,
  coaches,
  invoices,
  schedules,
  attendances = [],
  notifications = [],
  showInstallBtn,
  onInstallClick,
  onLogout,
  onRefresh,
  onAddSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
  onVerifyPayment,
  onCheckInAttendance,
  onMarkNotificationRead,
  onSubmitAttendance,
  onAddStudent,
  onAddCoach,
}: AppsBodyProps) {
  const content = (
    <>
      {activeTab === "dashboard" && (
        <DashboardOverviewTab
          sessionUser={sessionUser}
          sessionRole={sessionRole}
          students={students}
          coaches={coaches}
          invoices={invoices}
          schedules={schedules}
          attendances={attendances}
          notifications={notifications}
          onMarkNotificationRead={onMarkNotificationRead}
          setActiveTab={setActiveTab}
        />
      )}

      {activeTab === "jadwal" && (
        <JadwalTab
          schedules={schedules}
          students={students}
          coaches={coaches}
          onAddSchedule={onAddSchedule}
          onUpdateSchedule={onUpdateSchedule}
          onDeleteSchedule={onDeleteSchedule}
          setActiveTab={setActiveTab}
        />
      )}

      {activeTab === "keuangan" && (
        <KeuanganTab
          invoices={invoices}
          sessionRole={sessionRole}
          students={students}
          coaches={coaches}
          attendances={attendances}
          sessionUser={sessionUser}
          onVerifyPayment={onVerifyPayment}
          setActiveTab={setActiveTab}
        />
      )}

      {activeTab === "daftar_hadir" && (
        <DaftarHadirTab
          students={students}
          sessionRole={sessionRole}
          schedules={schedules}
          coaches={coaches}
          attendances={attendances}
          setActiveTab={setActiveTab}
        />
      )}

      {activeTab === "pelatih" && (
        <PelatihTab
          coaches={coaches}
          sessionRole={sessionRole}
          schedules={schedules}
          students={students}
          attendances={attendances}
          setActiveTab={setActiveTab}
        />
      )}

      {activeTab === "absensi" && (
        <AbsensiTab
          students={students}
          coaches={coaches}
          schedules={schedules}
          attendances={attendances}
          sessionUser={sessionUser}
          sessionRole={sessionRole}
          onCheckInAttendance={onCheckInAttendance}
          onSubmitAttendance={onSubmitAttendance}
          setActiveTab={setActiveTab}
        />
      )}

      {activeTab === "create" && (
        <RegistrasiTab
          onAddStudent={onAddStudent}
          onAddCoach={onAddCoach}
        />
      )}

      {activeTab === "profile" && (
        <ProfilTab
          sessionUser={sessionUser}
          sessionRole={sessionRole}
          students={students}
          coaches={coaches}
          schedules={schedules}
          showInstallBtn={showInstallBtn}
          onInstallClick={onInstallClick}
          onLogout={onLogout}
          onRefresh={onRefresh}
          setActiveTab={setActiveTab}
        />
      )}
    </>
  );

  return (
    <div
      className={`flex-1 overflow-y-auto ${
        activeTab === "dashboard" ||
        activeTab === "keuangan" ||
        activeTab === "profile" ||
        activeTab === "daftar_hadir" ||
        activeTab === "pelatih"
          ? "p-0"
          : "px-4 sm:px-6 pt-[max(3.5rem,calc(env(safe-area-inset-top)+1.5rem))] md:pt-6 pb-28 md:pb-6"
      }`}
    >
      {onRefresh ? (
        <PullToRefresh onRefresh={onRefresh} className="min-h-full">
          {content}
        </PullToRefresh>
      ) : (
        content
      )}
    </div>
  );
}

