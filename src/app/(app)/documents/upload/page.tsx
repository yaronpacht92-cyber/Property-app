import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { BackLink } from "@/components/layout/back-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HelpTip } from "@/components/ui/help-tip";
import { uploadDocumentAction } from "@/server/actions/documents";

export default async function UploadDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string }>;
}) {
  const session = await requirePermission(PERMISSIONS.DOCUMENTS_WRITE);
  const params = await searchParams;
  const properties = await prisma.property.findMany({
    where: { organizationId: session.user.organizationId, deletedAt: null },
    orderBy: { nickname: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-up">
      <BackLink href="/documents" label="Back to Documents" />
      <h1 className="text-4xl font-semibold">Upload Document</h1>
      <form
        action={async (formData) => {
          "use server";
          await uploadDocumentAction(formData);
        }}
        encType="multipart/form-data"
        className="space-y-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6"
      >
        <div className="space-y-2">
          <Label htmlFor="name">Document name</Label>
          <Input id="name" name="name" required placeholder="Oak Street Insurance Policy" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="propertyId">Property</Label>
          <select
            id="propertyId"
            name="propertyId"
            defaultValue={params.propertyId || ""}
            className="min-h-14 w-full rounded-xl border-2 border-[var(--border-strong)] bg-white px-4 text-lg"
          >
            <option value="">Whole portfolio</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.nickname}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <div className="flex items-center">
            <Label htmlFor="category">Document category</Label>
            <HelpTip text="Choose the closest match. You can use Other if you are unsure." />
          </div>
          <select
            id="category"
            name="category"
            defaultValue="OTHER"
            className="min-h-14 w-full rounded-xl border-2 border-[var(--border-strong)] bg-white px-4 text-lg"
          >
            {[
              "DEED",
              "CLOSING",
              "MORTGAGE",
              "INSURANCE",
              "PROPERTY_TAX",
              "LEASE",
              "INSPECTION",
              "APPRAISAL",
              "INVOICE",
              "RECEIPT",
              "WARRANTY",
              "CONTRACTOR_PROPOSAL",
              "PROPERTY_MANAGEMENT_AGREEMENT",
              "LEGAL",
              "ACCOUNTING",
              "PHOTO",
              "OTHER",
            ].map((category) => (
              <option key={category} value={category}>
                {category.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="expiresAt">Expiration date (if applicable)</Label>
          <Input id="expiresAt" name="expiresAt" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" placeholder="Optional" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="file">Choose file</Label>
          <Input id="file" name="file" type="file" required accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt" />
          <p className="text-base text-[var(--muted-foreground)]">
            PDF, photo, or Word document up to 15 MB. Files are private and checked for safety.
          </p>
        </div>
        <Button type="submit" size="large">
          Upload Document
        </Button>
      </form>
    </div>
  );
}
