import React from "react";
import { Student, Coach, Invoice, ScheduleSession } from "../types";
import DashboardOverviewTab from "./DashboardOverviewTab";
import KeuanganTab from "./KeuanganTab";
import DaftarHadirTab from "./DaftarHadirTab";
import AbsensiTab from "./AbsensiTab";
import RegistrasiTab from "./RegistrasiTab";
import JadwalTab from "./JadwalTab";
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
  onRefresh?: () => Promise<void>;
  onAddSchedule: (data: Omit<ScheduleSession, "id">) => void;
  onDeleteSchedule: (id: string) => void;
  onVerifyPayment: (invoiceId: string, confirm: boolean) => void;
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
  onRefresh,
  onAddSchedule,
  onDeleteSchedule,
  onVerifyPayment,
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
          setActiveTab={setActiveTab}
        />
      )}

      {activeTab === "jadwal" && (
        <JadwalTab
          schedules={schedules}
          students={students}
          coaches={coaches}
          onAddSchedule={onAddSchedule}
          onDeleteSchedule={onDeleteSchedule}
          setActiveTab={setActiveTab}
        />
      )}

      {activeTab === "keuangan" && (
        <KeuanganTab
          invoices={invoices}
          sessionRole={sessionRole}
          onVerifyPayment={onVerifyPayment}
        />
      )}

      {activeTab === "daftar_hadir" && (
        <DaftarHadirTab students={students} sessionRole={sessionRole} />
      )}

      {activeTab === "absensi" && (
        <AbsensiTab
          students={students}
          onSubmitAttendance={onSubmitAttendance}
        />
      )}

      {activeTab === "create" && (
        <RegistrasiTab
          onAddStudent={onAddStudent}
          onAddCoach={onAddCoach}
        />
      )}
    </>
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-6">
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
