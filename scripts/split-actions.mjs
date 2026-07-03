import fs from 'fs';

const src = fs.readFileSync('src/app/(dashboard)/actions.ts', 'utf8');
const lines = src.split(/\r?\n/);
const importEnd = lines.findIndex((l, i) => i > 0 && l.startsWith('export type ActionResult'));
const imports = lines.slice(0, importEnd).join('\n').replace(/^'use server';\s*/m, '');
const sharedLines = lines.slice(importEnd, importEnd + 9);

fs.mkdirSync('src/app/(dashboard)/actions', { recursive: true });

const sharedBody = `import { isServiceError } from '@/services/errors';

${sharedLines.join('\n')}

export function toActionError<T = void>(error: unknown): ActionResult<T> {
  if (isServiceError(error)) return { ok: false, error: error.message };
  if (error instanceof Error) return { ok: false, error: error.message };
  return { ok: false, error: 'Something went wrong' };
}
`;
fs.writeFileSync('src/app/(dashboard)/actions/_shared.ts', sharedBody);

const funcRe = /^export async function (\w+)/;
const funcs = [];
let start = -1;
let name = '';
for (let i = importEnd + 9; i < lines.length; i++) {
  const m = lines[i].match(funcRe);
  if (m) {
    if (name) funcs.push({ name, start, end: i });
    name = m[1];
    start = i;
  }
}
if (name) funcs.push({ name, start, end: lines.length });

const map = {
  members:
    /^(createMember|listMembers|listFamilies|getMember|updateMember|deleteMember|archiveMember|exportMembers|getMemberTimeline|inviteMemberToPortal|sendWaiverLink|updateMemberStripes|listMemberNotes|createMemberNote|deleteMemberNote|toggleMemberNotePin|listEmergencyContacts|createEmergencyContact|deleteEmergencyContact|getWaiverCompliance)/,
  gym: /^(getGymSettings|completeSetup|updateGymSettings|listLocations|createLocation|deleteLocation|getGbpStatus|syncDirectoryListings|setPlanActive)/,
  staff: /^(listStaff|inviteStaff|removeStaff|updateStaffRole)/,
  waivers:
    /^(listWaivers|getWaiver|signWaiver|createWaiver|updateWaiver|toggleWaiverStatus|bulkSendWaiver|exportWaiver|getWaiverCompletion)/,
  leads:
    /^(createLead|updateLead|assignLead|convertLead|listLeadNotes|createLeadNote|getMarketingFunnel|getLeadSource)/,
  classes:
    /^(createClass|listClasses|getEnrollmentCounts|deleteClass|updateClass|duplicateClass|getClassAttendance|listClassWaitlist|addToClassWaitlist|removeFromClassWaitlist|getClassSession|markClassSession|removeClassSession)/,
  belts:
    /^(promoteMember|undoPromotion|listBeltRequirements|saveBeltRequirement|getPromotionReadiness|getGymBeltSystem|exportMembersByBelt)/,
  billing:
    /^(getRevenueMetrics|listPastDueMembers|exportSubscriptionsCsv|createManualSubscription|getBillingMetrics)/,
  migration:
    /^(listImportJobs|importMembersCsv|importLeadsCsv|importAttendanceCsv|importBeltHistoryCsv|getImportErrors|rollbackImportJob)/,
  marketing:
    /^(listCampaigns|createCampaign|sendCampaign|scheduleCampaign|cancelScheduledCampaign|requestReview)/,
  shop: /^(listProducts|createProduct|listOrders|fulfillOrder)/,
  website:
    /^(listPrograms|createProgram|updateProgram|deleteProgram|listCoaches|createCoach|updateCoach|deleteCoach|addGalleryImage|listBlogPosts|createBlogPost|publishBlogPost|deleteBlogPost)/,
  ai: /^(listAiKnowledge|upsertAiKnowledge|deleteAiKnowledge|listAiConversations|listInbox|getConversationMessages)/,
  insights: /^(getBusinessInsights|refreshBusinessSnapshot|listAuditEvents)/,
};

const buckets = {};
for (const f of funcs) {
  let file = 'misc';
  for (const [k, re] of Object.entries(map)) {
    if (re.test(f.name)) {
      file = k;
      break;
    }
  }
  (buckets[file] ??= []).push(f);
}

for (const [file, list] of Object.entries(buckets)) {
  const body = list.map((f) => lines.slice(f.start, f.end).join('\n')).join('\n\n');
  const content = `'use server';

${imports}
import { type ActionResult, toActionError } from './_shared';

${body}
`;
  fs.writeFileSync(`src/app/(dashboard)/actions/${file}.ts`, content);
  console.log(file, list.length, 'functions');
}

const index = [
  "export type { ActionResult } from './_shared';",
  ...Object.keys(buckets)
    .sort()
    .map((f) => `export * from './${f}';`),
].join('\n');
fs.writeFileSync('src/app/(dashboard)/actions/index.ts', `${index}\n`);

fs.writeFileSync(
  'src/app/(dashboard)/actions.ts',
  `'use server';

export * from './actions/index';
export type { ActionResult } from './actions/_shared';
`
);

console.log('done', funcs.length, 'functions');
