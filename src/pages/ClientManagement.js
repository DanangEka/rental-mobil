import { useEffect, useState, useCallback } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { collection, getDocs, updateDoc, doc, deleteDoc } from "firebase/firestore";

import { auth, db } from "../services/firebase";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Icon from "../components/ui/Icon";
import Input from "../components/ui/Input";
import PageHeader from "../components/ui/PageHeader";
import Pill from "../components/ui/Pill";
import StatCard from "../components/ui/StatCard";

/**
 * Client database: search, status filter, and per-row identity actions.
 *
 * The Firestore and Auth contracts are unchanged — a single `getDocs` over
 * `users`, `verificationStatus` defaulting to `unverified` in the mapping
 * step, `deleteDoc` for removal, `updateDoc` for verification, and
 * `sendPasswordResetEmail` for the reset action.
 *
 * Row layout is kept as the flex-row card list it already was rather than
 * being forced into the `Table` primitive: the columns are a fixed 30/20/15/15
 * split that has to survive a narrow viewport by stacking, which a real
 * `<table>` cannot do without per-cell breakpoints.
 */

/** Status drives a Pill variant and an icon, never colour alone. */
const STATUS = {
  verified: { pill: "available", label: "verified" },
  pending: { pill: "sand", label: "pending" },
  unverified: { pill: "danger", label: "unverified" },
};

const FILTERS = [
  { val: "", label: "Semua Client" },
  { val: "unverified", label: "Unverified" },
  { val: "pending", label: "Pending" },
  { val: "verified", label: "Verified" },
];

const COLUMNS = (
  <div className="hidden md:flex items-center px-space-lg font-label-sm text-label-sm uppercase tracking-widest text-c57-on-surface-variant">
    <div className="w-[30%]">Client / Identitas</div>
    <div className="w-[20%]">Kontak</div>
    <div className="w-[15%] text-center">Status</div>
    <div className="w-[15%] text-center">Bergabung</div>
    <div className="flex-1 text-right">Aksi</div>
  </div>
);

export default function ClientManagement() {
  const [clients, setClients] = useState([]);
  const [searchClients, setSearchClients] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchClients = useCallback(async () => {
    try {
      const snapC = await getDocs(collection(db, "users"));
      const clientsData = snapC.docs.map((clientDoc) => {
        const data = clientDoc.data();
        if (!data.verificationStatus) {
          data.verificationStatus = "unverified";
        }
        return { id: clientDoc.id, ...data };
      });
      setClients(clientsData);
    } catch (error) {
      console.error("Gagal fetch clients:", error);
    }
  }, []);

  useEffect(() => {
    const checkAdmin = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const idTokenResult = await user.getIdTokenResult();
        if (idTokenResult.claims.admin === true) {
          setIsAdmin(true);
          fetchClients();
        }
      } catch (error) {
        console.error("Error verifikasi admin:", error.message);
      }

      setLoading(false);
    };

    checkAdmin();
  }, [fetchClients]);

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      searchClients === "" ||
      c.nama?.toLowerCase().includes(searchClients.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchClients.toLowerCase()) ||
      c.nomorTelepon?.includes(searchClients);

    const matchesStatus = filterStatus === "" || c.verificationStatus === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const handleDeleteClient = async (id) => {
    if (!window.confirm("Hapus client ini?")) return;
    try {
      await deleteDoc(doc(db, "users", id));
      fetchClients();
    } catch (error) {
      console.error("Gagal hapus client:", error);
    }
  };

  const handleVerifyClient = async (id, status) => {
    try {
      await updateDoc(doc(db, "users", id), {
        verificationStatus: status,
      });
      fetchClients();
      alert("Status verifikasi diperbarui.");
    } catch (error) {
      console.error("Gagal verifikasi client:", error);
    }
  };

  const handleResetPassword = async (email) => {
    if (!window.confirm(`Kirim email reset password ke ${email}?`)) return;
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Email reset paksa terkirim.");
    } catch (error) {
      console.error("Gagal reset password:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-c57-surface-container-low pt-30 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-c57-surface-container-highest border-t-c57-primary-container rounded-full animate-spin" role="status" aria-label="Memuat data client" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-c57-surface-container-low pt-30 flex items-center justify-center px-gutter-mobile sm:px-gutter text-center">
        <Card className="max-w-md w-full p-space-xl">
          <span className="w-20 h-20 rounded-full bg-c57-error-container text-c57-on-error-container flex items-center justify-center mx-auto mb-space-lg">
            <Icon name="lock" size="3xl" />
          </span>
          <h2 className="font-headline-md text-headline-md text-c57-on-surface mb-space-sm">
            Akses Terbatas
          </h2>
          <p className="text-body-md text-c57-on-surface-variant italic">
            Otoritas administrator diperlukan untuk akses database client.
          </p>
          <div className="h-1.5 w-12 bg-c57-primary-container mx-auto rounded-full mt-space-lg" />
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-c57-surface-container-low pt-30 pb-space-xl">
      <div className="max-w-7xl mx-auto px-gutter-mobile sm:px-gutter">
        <PageHeader
          eyebrow="Keamanan & Data Pengguna"
          title="Manajemen Client"
          subtitle="Kelola hak akses, verifikasi identitas, dan aktivitas pelanggan."
          actions={
            <div className="w-full md:w-80">
              <Input
                icon="search"
                label="Cari client"
                placeholder="Cari nama, email, atau telepon..."
                value={searchClients}
                onChange={(e) => setSearchClients(e.target.value)}
              />
            </div>
          }
        />

        {/* Status roll-up */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-gutter mt-space-xl">
          <StatCard
            label="Belum Verifikasi"
            value={clients.filter((c) => c.verificationStatus === "unverified").length}
            icon="person_alert"
          />
          <StatCard
            label="Menunggu Validasi"
            value={clients.filter((c) => c.verificationStatus === "pending").length}
            icon="pending"
          />
          <StatCard
            label="Client Terverifikasi"
            value={clients.filter((c) => c.verificationStatus === "verified").length}
            icon="verified_user"
          />
        </div>

        {/* Filter bar */}
        <Card variant="inset" className="mt-gutter p-space-lg mb-gutter">
          <div className="flex flex-wrap items-center gap-space-md">
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-c57-on-surface-variant">
              Filter Status:
            </span>
            <div className="flex flex-wrap gap-space-sm">
              {FILTERS.map((f) => {
                const active = filterStatus === f.val;
                return (
                  <button
                    key={f.val}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilterStatus(f.val)}
                    className={[
                      "px-space-md py-2 rounded-c57-md font-label-sm text-label-sm uppercase tracking-widest",
                      "transition-all duration-200 focus-visible:outline focus-visible:outline-2",
                      "focus-visible:outline-offset-2 focus-visible:outline-c57-primary",
                      active
                        ? "bg-c57-primary-container text-c57-on-primary shadow-c57-card"
                        : "bg-c57-surface-container-lowest text-c57-on-surface-variant hover:bg-c57-surface-container",
                    ].join(" ")}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Client list */}
        <div className="space-y-space-sm">
          {COLUMNS}

          {filteredClients.map((c) => (
            <ClientRow
              key={c.id}
              client={c}
              onVerify={(status) => handleVerifyClient(c.id, status)}
              onResetPassword={() => handleResetPassword(c.email)}
              onDelete={() => handleDeleteClient(c.id)}
            />
          ))}

          {filteredClients.length === 0 && (
            <EmptyState
              icon="search"
              title="Database tidak ditemukan"
              description="Tidak ada client yang cocok dengan kata kunci atau filter status ini."
            />
          )}
        </div>
      </div>
    </div>
  );
}

const ACTION_BASE =
  "p-2.5 rounded-c57-md transition-colors duration-200 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c57-primary";

function ActionButton({ icon, label, tone = "neutral", onClick }) {
  const tones = {
    positive:
      "bg-c57-available-bg text-c57-available-text hover:bg-c57-available-text hover:text-c57-on-primary",
    caution:
      "bg-c57-tertiary-container text-c57-on-tertiary-container hover:bg-c57-tertiary hover:text-c57-on-tertiary",
    neutral:
      "bg-c57-surface-container text-c57-on-surface-variant hover:bg-c57-primary-container hover:text-c57-on-primary",
    danger:
      "bg-c57-error-container text-c57-on-error-container hover:bg-c57-error hover:text-c57-on-error",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`${ACTION_BASE} ${tones[tone]}`}
    >
      <Icon name={icon} size="lg" />
    </button>
  );
}

function ClientRow({ client, onVerify, onResetPassword, onDelete }) {
  const status = STATUS[client.verificationStatus] || STATUS.unverified;
  const verified = client.verificationStatus === "verified";

  return (
    <Card className="p-space-md sm:px-space-lg hover:shadow-c57-card-hover transition-shadow">
      <div className="flex flex-col md:flex-row md:items-center gap-space-lg">
        {/* Identity */}
        <div className="md:w-[30%] flex items-center gap-space-md">
          <div className="w-14 h-14 rounded-c57-md bg-c57-surface-container-low border border-c57-surface-variant overflow-hidden shrink-0 flex items-center justify-center text-c57-outline">
            {client.ktpURL ? (
              <img src={client.ktpURL} className="w-full h-full object-cover" alt="KTP" />
            ) : (
              <Icon name="person" size="2xl" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="font-headline-sm text-headline-sm text-c57-on-surface truncate">
              {client.nama || "User Baru"}
            </h4>
            <p className="font-label-sm text-label-sm uppercase tracking-widest text-c57-on-surface-variant">
              {client.role || "Pelanggan"}
            </p>
          </div>
        </div>

        {/* Contact */}
        <div className="md:w-[20%] space-y-1">
          <div className="flex items-center gap-space-sm text-body-sm text-c57-on-surface-variant">
            <Icon name="mail" size="xs" className="text-c57-outline shrink-0" />
            <span className="truncate">{client.email}</span>
          </div>
          <div className="flex items-center gap-space-sm text-body-sm text-c57-on-surface-variant">
            <Icon name="phone" size="xs" className="text-c57-outline shrink-0" />
            <span>{client.nomorTelepon || "-"}</span>
          </div>
        </div>

        {/* Status */}
        <div className="md:w-[15%] flex justify-center">
          <Pill variant={status.pill}>{status.label}</Pill>
        </div>

        {/* Joined */}
        <div className="md:w-[15%] text-center">
          <p className="text-body-md text-c57-on-surface tabular-nums">
            {client.createdAt
              ? new Date(client.createdAt.seconds * 1000).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "N/A"}
          </p>
        </div>

        {/* Actions */}
        <div className="flex-1 flex justify-end gap-space-sm">
          <ActionButton
            icon={verified ? "person_alert" : "verified_user"}
            label={verified ? "Batalkan Verifikasi" : "Verifikasi"}
            tone={verified ? "caution" : "positive"}
            onClick={() => onVerify(verified ? "unverified" : "verified")}
          />
          <ActionButton
            icon="vpn_key"
            label="Reset Password"
            onClick={onResetPassword}
          />
          <ActionButton
            icon="delete"
            label="Hapus Client"
            tone="danger"
            onClick={onDelete}
          />
        </div>
      </div>
    </Card>
  );
}
