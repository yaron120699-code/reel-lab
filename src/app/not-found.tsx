import { EmptyState, PageHeader } from "@/components/ui";

export default function NotFound() {
  return (
    <>
      <PageHeader eyebrow="404" title="לא נמצא" />
      <EmptyState
        title="הדף הזה לא קיים"
        body="ייתכן שהריל נמחק, או שהכתובת השתנתה. ספריית הרילים היא נקודת ההתחלה הבטוחה."
        actionHref="/reels"
        actionLabel="לספריית הרילים"
      />
    </>
  );
}
