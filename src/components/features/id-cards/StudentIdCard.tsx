export type IdCardStudent = {
  studentId: string;
  sectionId: string;
  fullName: string;
  photoUrl: string | null;
  idNumber: string;
  classLabel: string;
  guardianName: string | null;
  guardianPhone: string | null;
};

export type IdCardBranding = {
  orgName: string;
  orgLogoUrl: string | null;
  orgAddress: string | null;
  idLabel: string; // "Admission No." (school) or "Registration No." (college)
  principalName: string | null;
  principalSignatureUrl: string | null;
};

// CR80-ish printable card, sized in real-world units (mm) so it prints at a believable ID-card
// size regardless of the browser's print scaling — deliberately Ilm AI's own look (teal/gold
// accent, not the competitor's card design), just borrowing the "photo + reg no + class + guardian
// contact + principal signature" information architecture.
export function StudentIdCard({ student, branding }: { student: IdCardStudent; branding: IdCardBranding }) {
  return (
    <div
      className="border-border bg-card flex flex-col overflow-hidden rounded-lg border shadow-sm print:break-inside-avoid print:shadow-none"
      style={{ width: '85.6mm', height: '54mm' }}
    >
      <div className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-teal-700 px-2.5 py-1.5 text-white">
        {branding.orgLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- institution-supplied logo
          <img src={branding.orgLogoUrl} alt="" className="h-6 w-6 shrink-0 rounded-full bg-white object-contain p-0.5" />
        ) : (
          <div className="h-6 w-6 shrink-0 rounded-full bg-white/20" />
        )}
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[10px] font-bold">{branding.orgName}</p>
          <p className="text-[7px] tracking-wide text-teal-100 uppercase">Student ID Card</p>
        </div>
      </div>

      <div className="flex flex-1 gap-2 p-2">
        <div className="border-border bg-muted h-[22mm] w-[18mm] shrink-0 overflow-hidden rounded border">
          {student.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- institution-supplied student photo
            <img src={student.photoUrl} alt={student.fullName} className="h-full w-full object-cover" />
          ) : (
            <div className="text-muted-foreground flex h-full w-full items-center justify-center text-[8px]">No photo</div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-0.5 text-[8px] leading-tight">
          <p className="truncate text-[10px] font-bold">{student.fullName}</p>
          <p><span className="text-muted-foreground">{branding.idLabel}</span> {student.idNumber}</p>
          <p><span className="text-muted-foreground">Class</span> {student.classLabel || '—'}</p>
          <p className="truncate"><span className="text-muted-foreground">Guardian</span> {student.guardianName || '—'}</p>
          <p><span className="text-muted-foreground">Contact</span> {student.guardianPhone || '—'}</p>
        </div>
      </div>

      <div className="border-border flex items-end justify-between border-t px-2.5 py-1">
        <p className="text-muted-foreground truncate text-[6.5px]">{branding.orgAddress || ''}</p>
        <div className="shrink-0 text-center">
          {branding.principalSignatureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- institution-supplied signature
            <img src={branding.principalSignatureUrl} alt="" className="h-4 w-14 object-contain" />
          ) : (
            <div className="h-4 w-14" />
          )}
          <p className="border-t border-foreground/40 text-[6px] leading-tight">
            {branding.principalName || 'Principal'}
          </p>
        </div>
      </div>
    </div>
  );
}
