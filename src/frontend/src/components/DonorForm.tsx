import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DonorStatus } from "../backend";
import type { AreaDto, DistrictDto } from "../backend";
import { useActor } from "../hooks/useActor";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;

interface DonorFormProps {
  areaManagerId?: bigint;
  onSuccess?: () => void;
  onCancel?: () => void;
  prefillDistrictId?: bigint;
  prefillAreaId?: bigint;
  prefillAreaManagerId?: bigint;
}

export function DonorForm({
  areaManagerId,
  onSuccess,
  onCancel,
  prefillDistrictId,
  prefillAreaId,
  prefillAreaManagerId,
}: DonorFormProps) {
  const { actor } = useActor();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [districts, setDistricts] = useState<DistrictDto[]>([]);
  const [areas, setAreas] = useState<AreaDto[]>([]);
  const [form, setForm] = useState({
    name: "",
    contact: "",
    bloodGroup: "",
    districtId: prefillDistrictId?.toString() ?? "",
    areaId: prefillAreaId?.toString() ?? "",
    age: "",
    lastDonatedDate: "",
  });

  useEffect(() => {
    if (!actor) return;
    actor
      .getDistricts()
      .then(setDistricts)
      .catch(() => {});
  }, [actor]);

  useEffect(() => {
    if (!actor || !form.districtId) {
      setAreas([]);
      return;
    }
    actor
      .getAreasByDistrict(BigInt(form.districtId))
      .then(setAreas)
      .catch(() => {});
  }, [actor, form.districtId]);

  const set = (k: keyof typeof form, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor) return;
    if (
      !form.name ||
      !form.contact ||
      !form.bloodGroup ||
      !form.districtId ||
      !form.areaId ||
      !form.age
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    let amId = areaManagerId ?? prefillAreaManagerId;
    if (!amId) {
      const ams = await actor.getApprovedAreaManagersByDistrict(
        BigInt(form.districtId),
      );
      const am = ams.find((a) => a.areaId === BigInt(form.areaId));
      if (!am) {
        toast.error(
          "No approved Area Manager for this area. Cannot add donor.",
        );
        return;
      }
      amId = am.id;
    }

    let lastDonatedTs: bigint | null = null;
    if (form.lastDonatedDate) {
      lastDonatedTs = BigInt(new Date(form.lastDonatedDate).getTime());
    }

    const now = Date.now();
    let initialStatus = DonorStatus.available;
    if (lastDonatedTs !== null) {
      const diffMs = now - Number(lastDonatedTs);
      if (diffMs < THREE_MONTHS_MS) {
        initialStatus = DonorStatus.tempRejected;
      }
    }

    setIsSubmitting(true);
    try {
      await actor.addDonor(
        form.name,
        form.contact,
        form.bloodGroup,
        BigInt(form.districtId),
        BigInt(form.areaId),
        BigInt(Number(form.age)),
        lastDonatedTs,
        amId,
      );

      toast.success(
        initialStatus === DonorStatus.tempRejected
          ? "Donor added (Temporarily Rejected — donated within 3 months)"
          : "Donor added successfully!",
      );
      onSuccess?.();
    } catch (err) {
      toast.error(`Failed to add donor: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      data-ocid="donor_form.dialog"
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label
            htmlFor="df-name"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Full Name *
          </label>
          <input
            id="df-name"
            className="form-input"
            placeholder="Donor full name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            data-ocid="donor_form.input"
          />
        </div>
        <div>
          <label
            htmlFor="df-contact"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Contact *
          </label>
          <input
            id="df-contact"
            className="form-input"
            placeholder="Phone number"
            value={form.contact}
            onChange={(e) => set("contact", e.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor="df-bloodGroup"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Blood Group *
          </label>
          <select
            id="df-bloodGroup"
            className="form-input"
            value={form.bloodGroup}
            onChange={(e) => set("bloodGroup", e.target.value)}
            data-ocid="donor_form.select"
          >
            <option value="">Select</option>
            {BLOOD_GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="df-age"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Age *
          </label>
          <input
            id="df-age"
            type="number"
            min="18"
            max="65"
            className="form-input"
            placeholder="Age"
            value={form.age}
            onChange={(e) => set("age", e.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor="df-lastDonated"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Last Donated Date
          </label>
          <input
            id="df-lastDonated"
            type="date"
            className="form-input"
            value={form.lastDonatedDate}
            onChange={(e) => set("lastDonatedDate", e.target.value)}
          />
        </div>
        {!prefillDistrictId && (
          <>
            <div className="col-span-2">
              <label
                htmlFor="df-district"
                className="block text-sm font-medium text-foreground mb-1"
              >
                District *
              </label>
              <select
                id="df-district"
                className="form-input"
                value={form.districtId}
                onChange={(e) => {
                  set("districtId", e.target.value);
                  set("areaId", "");
                }}
              >
                <option value="">Select district</option>
                {districts.map((d) => (
                  <option key={d.id.toString()} value={d.id.toString()}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label
                htmlFor="df-area"
                className="block text-sm font-medium text-foreground mb-1"
              >
                Area *
              </label>
              <select
                id="df-area"
                className="form-input"
                value={form.areaId}
                onChange={(e) => set("areaId", e.target.value)}
                disabled={!form.districtId}
              >
                <option value="">Select area</option>
                {areas.map((a) => (
                  <option key={a.id.toString()} value={a.id.toString()}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        {prefillDistrictId && !prefillAreaId && (
          <div className="col-span-2">
            <label
              htmlFor="df-area2"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Area *
            </label>
            <select
              id="df-area2"
              className="form-input"
              value={form.areaId}
              onChange={(e) => set("areaId", e.target.value)}
            >
              <option value="">Select area</option>
              {areas.map((a) => (
                <option key={a.id.toString()} value={a.id.toString()}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={onCancel}
            data-ocid="donor_form.cancel_button"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="btn-danger flex-1"
          disabled={isSubmitting}
          data-ocid="donor_form.submit_button"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Adding...
            </span>
          ) : (
            "Add Donor"
          )}
        </button>
      </div>
    </form>
  );
}
