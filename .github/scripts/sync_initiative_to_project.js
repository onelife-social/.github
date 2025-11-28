// .github/scripts/sync-initiative-to-project.js

module.exports = async ({ github, context, core }) => {
  const issue = context.payload.issue;
  const labels = (issue.labels || []).map((l) => l.name);
  const body = issue.body || "";
  const issueNodeId = issue.node_id;

  const { owner, repo } = context.repo;
  const issueNumber = issue.number;

  core.info(`Syncing initiative for issue #${issue.number}`);
  core.info(`Issue type: ${issue.issue_type?.name || "unknown"}`);
  core.info(`Issue labels: ${labels.join(", ")}`);

  const projectId = "PVT_kwDOB3GKus4Aijmy";

  // Project field IDs
  const FIELD_IDS = {
    WORKFLOW_PHASE: "PVTSSF_lADOB3GKus4Aijmyzg5QP-s",
    NSM: "PVTSSF_lADOB3GKus4Aijmyzg4OqYo",
    OKR: "PVTSSF_lADOB3GKus4Aijmyzg4OsCs",
    SQUAD: "PVTSSF_lADOB3GKus4AijmyzgfJCPA",
    REACH: "PVTF_lADOB3GKus4Aijmyzg4iSz0",

    // Single-select fields
    IMPACT_SELECT: "PVTSSF_lADOB3GKus4Aijmyzg5VdFo",
    CONFIDENCE_SELECT: "PVTSSF_lADOB3GKus4Aijmyzg5VebI",
    SIZE: "PVTSSF_lADOB3GKus4AijmyzgbDm2I",

    // Numeric fields
    RICE: "PVTF_lADOB3GKus4Aijmyzg4iTEQ",

    // Priority single-select
    PRIORITY: "PVTSSF_lADOB3GKus4AijmyzgbDm2E",
  };

  // Workflow Phase options
  const WF_OPTIONS = {
    "wf-discovery": "041bb0d9",
    "wf-design": "3fd8f8cd",
    "wf-implementation": "9fc55396",
    "wf-results": "509378eb",
    "wf-done": "abea4c05",
  };

  // Priority options
  const PRIORITY_OPTIONS = {
    VERY_LOW: "e40d1db7",     // 🏖️Very low
    LOW: "99dda7bd",          // 🏝 Low
    MEDIUM: "ae238a73",       // 🏕 Medium
    HIGH: "e0d1d5fa",         // 🏔 High
    VERY_HIGH: "afa4f8ad",    // 🗻Very high
    URGENT: "f2613924",       // 🌋 Urgent (not set automatically)
  };

  // NSM options
  const NSM_OPTIONS = {
    "nsm-revenue": "3d19c9f6",
    "nsm-retention": "aaf7b16e",
    "nsm-nps": "434ba49f",
  };

  // OKR options
  const OKR_OPTIONS = {
    "okr-revenue-q3": "3bd60deb",
    "okr-nps-60": "2960735a",
    "okr-retention-w1w5": "dd8f22b0",
    "okr-other": "82357c06",
  };

  // Squad options
  const SQUAD_OPTIONS = {
    "squad-quality": "2f6734ea",
    "squad-value-proposition": "0bb6ea9f",
    "squad-monetization": "77cca23d",
    "squad-viral-coefficient": "8f8fd22c",
    "squad-retention": "0ee613f0",
    "squad-security": "a456f5ba",
    "squad-cost": "e0e446a4",
  };

  // Impact mapping from tokens
  const IMPACT_VALUES = {
    "impact-minimal": 0.25,
    "impact-low": 0.5,
    "impact-medium": 1,
    "impact-high": 2,
    "impact-massive": 3,
  };

  // Impact options → optionId
  const IMPACT_OPTIONS = {
    "impact-minimal": "0eb273fb",
    "impact-low": "fd428338",
    "impact-medium": "e4581220",
    "impact-high": "88a8e63c",
    "impact-massive": "20141f24",
  };

  // Impact optionId → numeric
  const IMPACT_OPTION_TO_VALUE = {
    "0eb273fb": 0.25,
    "fd428338": 0.5,
    "e4581220": 1,
    "88a8e63c": 2,
    "20141f24": 3,
  };

  // Confidence mapping from tokens
  const CONFIDENCE_VALUES = {
    "confidence-20": 0.2,
    "confidence-40": 0.4,
    "confidence-60": 0.6,
    "confidence-80": 0.8,
    "confidence-100": 1.0,
  };

  // Confidence options → optionId
  const CONFIDENCE_OPTIONS = {
    "confidence-20": "284ef748",
    "confidence-40": "f26350a8",
    "confidence-60": "665274c5",
    "confidence-80": "2fa27cea",
    "confidence-100": "46f07b90",
  };

  // Confidence optionId → numeric
  const CONFIDENCE_OPTION_TO_VALUE = {
    "284ef748": 0.2,
    "f26350a8": 0.4,
    "665274c5": 0.6,
    "2fa27cea": 0.8,
    "46f07b90": 1.0,
  };

  // Effort / Size: tokens → numeric effort
  const EFFORT_VALUES = {
    "effort-xxtiny": 0,
    "effort-xtiny": 0.5,
    "effort-tiny": 1,
    "effort-small": 2,
    "effort-medium": 3,
    "effort-large": 5,
    "effort-xlarge": 8,
    "effort-xxlarge": 13,
    "effort-massive": 20,
  };

  // Effort / Size: tokens → Size optionId
  const SIZE_OPTIONS = {
    "effort-xxtiny": "405714de", // 🐣 XX-Tiny
    "effort-xtiny": "f568e1b9",  // 🦋 X-Tiny
    "effort-tiny": "41b8be95",   // 🦔 Tiny
    "effort-small": "bd920d78",  // 🐇 Small
    "effort-medium": "af69dd27", // 🦑 Medium
    "effort-large": "2a3ab5d1",  // 🐂 Large
    "effort-xlarge": "aba93493", // 🐋 X-Large
    "effort-xxlarge": "e65634c9",// 🐳 XX-Large
    "effort-massive": "124b7e91" // 🦣 Massive
  };

  // Size optionId → numeric effort (for edits)
  const SIZE_OPTION_TO_EFFORT = {
    "405714de": 0,
    "f568e1b9": 0.5,
    "41b8be95": 1,
    "bd920d78": 2,
    "af69dd27": 3,
    "2a3ab5d1": 5,
    "aba93493": 8,
    "e65634c9": 13,
    "124b7e91": 20,
  };

  function hasToken(token) {
    return body.includes(token);
  }

  // Extract numeric value from the line after a given label
  function extractNumberAfter(label) {
    const regex = new RegExp(label + "[^\\n]*\\n+([^\\n]+)");
    const match = body.match(regex);
    if (!match) return null;

    const raw = match[1].trim();
    const cleaned = raw.replace(/[^0-9.,-]/g, "").replace(",", ".");
    const value = parseFloat(cleaned);
    return Number.isFinite(value) ? value : null;
  }

  // Update single-select
  async function updateSingleSelect(fieldId, optionId, itemId) {
    if (!optionId) return;
    await github.graphql(
      `
      mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
        updateProjectV2ItemFieldValue(
          input: {
            projectId: $projectId,
            itemId: $itemId,
            fieldId: $fieldId,
            value: { singleSelectOptionId: $optionId }
          }
        ) {
          projectV2Item { id }
        }
      }
      `,
      {
        projectId,
        itemId,
        fieldId,
        optionId,
      }
    );
    core.info(
      `Updated single-select field ${fieldId} with option ${optionId} for item ${itemId}`
    );
  }

  // Update number (with rounding for RICE)
  async function updateNumber(fieldId, numberValue, itemId) {
    if (
      numberValue === null ||
      numberValue === undefined ||
      Number.isNaN(numberValue)
    ) {
      return;
    }

    let value = numberValue;

    if (fieldId === FIELD_IDS.RICE) {
      value = Math.round(numberValue * 100) / 100; // 2 decimals
      core.info(`Rounding RICE before saving: raw=${numberValue}, rounded=${value}`);
    }

    await github.graphql(
      `
      mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: Float!) {
        updateProjectV2ItemFieldValue(
          input: {
            projectId: $projectId,
            itemId: $itemId,
            fieldId: $fieldId,
            value: { number: $value }
          }
        ) {
          projectV2Item { id }
        }
      }
      `,
      {
        projectId,
        itemId,
        fieldId,
        value,
      }
    );
    core.info(
      `Updated number field ${fieldId} with value ${value} for item ${itemId}`
    );
  }

  // Priority from RICE
  function getPriorityOptionFromRice(rice) {
    if (rice == null || Number.isNaN(rice)) return null;

    if (rice >= 50000) return PRIORITY_OPTIONS.VERY_HIGH;
    if (rice >= 25000) return PRIORITY_OPTIONS.HIGH;
    if (rice >= 8000)  return PRIORITY_OPTIONS.MEDIUM;
    if (rice >= 2000)  return PRIORITY_OPTIONS.LOW;
    if (rice >= 0)     return PRIORITY_OPTIONS.VERY_LOW;

    return null;
  }

  // 1) Find Project item
  const itemQuery = `
    query($owner:String!, $repo:String!, $number:Int!) {
      repository(owner:$owner, name:$repo) {
        issue(number:$number) {
          id
          projectItems(first: 20) {
            nodes {
              id
              project {
                id
                number
                title
              }
            }
          }
        }
      }
    }
  `;

  const itemData = await github.graphql(itemQuery, {
    owner,
    repo,
    number: issueNumber,
  });

  const issueNode = itemData.repository.issue;
  if (!issueNode) {
    core.info("Issue node not found in repository. Aborting.");
    return;
  }

  const projectItem = issueNode.projectItems.nodes.find(
    (n) => n.project && n.project.id === projectId
  );

  if (!projectItem) {
    core.info("Project item not found for this issue in the target project. Aborting.");
    return;
  }

  const itemId = projectItem.id;
  core.info(`Project item for issue found: ${itemId}`);

  // 2) Workflow Phase = Discovery
  await updateSingleSelect(FIELD_IDS.WORKFLOW_PHASE, WF_OPTIONS["wf-discovery"], itemId);

  // 3) NSM
  let nsmOptionId = null;
  if (hasToken("nsm-revenue")) nsmOptionId = NSM_OPTIONS["nsm-revenue"];
  else if (hasToken("nsm-retention")) nsmOptionId = NSM_OPTIONS["nsm-retention"];
  else if (hasToken("nsm-nps")) nsmOptionId = NSM_OPTIONS["nsm-nps"];
  await updateSingleSelect(FIELD_IDS.NSM, nsmOptionId, itemId);

  // 4) Squad
  let squadOptionId = null;
  for (const [token, optId] of Object.entries(SQUAD_OPTIONS)) {
    if (hasToken(token)) {
      squadOptionId = optId;
      break;
    }
  }
  await updateSingleSelect(FIELD_IDS.SQUAD, squadOptionId, itemId);

  // 5) OKR
  let okrOptionId = null;
  for (const [token, optId] of Object.entries(OKR_OPTIONS)) {
    if (hasToken(token)) {
      okrOptionId = optId;
      break;
    }
  }
  await updateSingleSelect(FIELD_IDS.OKR, okrOptionId, itemId);

  // 6) Impact from tokens (on creation)
  let impactNumericFromTokens = null;
  let impactSelectOptionIdFromTokens = null;
  for (const [token, val] of Object.entries(IMPACT_VALUES)) {
    if (hasToken(token)) {
      impactNumericFromTokens = val;
      impactSelectOptionIdFromTokens = IMPACT_OPTIONS[token];
      break;
    }
  }
  core.info(`Impact numeric (from tokens): ${impactNumericFromTokens}`);
  if (impactSelectOptionIdFromTokens) {
    await updateSingleSelect(
      FIELD_IDS.IMPACT_SELECT,
      impactSelectOptionIdFromTokens,
      itemId
    );
  }

  // 7) Confidence from tokens (on creation)
  let confidenceNumericFromTokens = null;
  let confidenceSelectOptionIdFromTokens = null;
  for (const [token, val] of Object.entries(CONFIDENCE_VALUES)) {
    if (hasToken(token)) {
      confidenceNumericFromTokens = val;
      confidenceSelectOptionIdFromTokens = CONFIDENCE_OPTIONS[token];
      break;
    }
  }
  core.info(`Confidence numeric (from tokens): ${confidenceNumericFromTokens}`);
  if (confidenceSelectOptionIdFromTokens) {
    await updateSingleSelect(
      FIELD_IDS.CONFIDENCE_SELECT,
      confidenceSelectOptionIdFromTokens,
      itemId
    );
  }

  // 8) Reach from form body
  const reachValueFromBody = extractNumberAfter("📈 Reach estimado");
  core.info(`Reach parsed from body: ${reachValueFromBody}`);
  await updateNumber(FIELD_IDS.REACH, reachValueFromBody, itemId);

  // 9) Effort from tokens → Size only (no numeric field in project)
  let effortNumericFromTokens = null;
  let sizeOptionIdFromTokens = null;
  for (const [token, val] of Object.entries(EFFORT_VALUES)) {
    if (hasToken(token)) {
      effortNumericFromTokens = val;
      sizeOptionIdFromTokens = SIZE_OPTIONS[token];
      break;
    }
  }
  core.info(`Effort numeric (from tokens / Size): ${effortNumericFromTokens}`);
  if (sizeOptionIdFromTokens) {
    await updateSingleSelect(FIELD_IDS.SIZE, sizeOptionIdFromTokens, itemId);
  }

  // 10) Read values from Project (numbers + selects) to compute RICE
  const fieldValuesResult = await github.graphql(
    `
    query($itemId: ID!) {
      node(id: $itemId) {
        ... on ProjectV2Item {
          fieldValues(first: 50) {
            nodes {
              __typename
              ... on ProjectV2ItemFieldNumberValue {
                field {
                  ... on ProjectV2FieldCommon {
                    id
                    name
                  }
                }
                number
              }
              ... on ProjectV2ItemFieldSingleSelectValue {
                field {
                  ... on ProjectV2FieldCommon {
                    id
                    name
                  }
                }
                optionId
              }
            }
          }
        }
      }
    }
    `,
    { itemId }
  );

  const fieldNodes = fieldValuesResult?.node?.fieldValues?.nodes || [];
  const numbersByFieldId = {};
  const selectsByFieldId = {};

  for (const fv of fieldNodes) {
    if (fv.__typename === "ProjectV2ItemFieldNumberValue") {
      const fieldId = fv?.field?.id;
      if (fieldId && fv.number != null) {
        numbersByFieldId[fieldId] = fv.number;
      }
    } else if (fv.__typename === "ProjectV2ItemFieldSingleSelectValue") {
      const fieldId = fv?.field?.id;
      if (fieldId && fv.optionId) {
        selectsByFieldId[fieldId] = fv.optionId;
      }
    }
  }

  const reach = numbersByFieldId[FIELD_IDS.REACH];
  const riceExisting = numbersByFieldId[FIELD_IDS.RICE];

  // Prefer numeric from tokens on creation; fallback to select mapping (edits)
  let impactNumeric = impactNumericFromTokens;
  if (impactNumeric == null) {
    const impactOptionId = selectsByFieldId[FIELD_IDS.IMPACT_SELECT];
    if (impactOptionId && IMPACT_OPTION_TO_VALUE[impactOptionId] != null) {
      impactNumeric = IMPACT_OPTION_TO_VALUE[impactOptionId];
    }
  }

  let confidenceNumeric = confidenceNumericFromTokens;
  if (confidenceNumeric == null) {
    const confidenceOptionId = selectsByFieldId[FIELD_IDS.CONFIDENCE_SELECT];
    if (confidenceOptionId && CONFIDENCE_OPTION_TO_VALUE[confidenceOptionId] != null) {
      confidenceNumeric = CONFIDENCE_OPTION_TO_VALUE[confidenceOptionId];
    }
  }

  let effortNumeric = effortNumericFromTokens;
  if (effortNumeric == null) {
    const sizeOptionId = selectsByFieldId[FIELD_IDS.SIZE];
    if (sizeOptionId && SIZE_OPTION_TO_EFFORT[sizeOptionId] != null) {
      effortNumeric = SIZE_OPTION_TO_EFFORT[sizeOptionId];
      core.info(`Effort numeric derived from Size: ${effortNumeric}`);
    }
  }

  core.info("Numeric values used for RICE computation:");
  core.info(
    JSON.stringify(
      {
        reach,
        impactNumeric,
        confidenceNumeric,
        effortNumeric,
        riceExisting,
      },
      null,
      2
    )
  );

  let riceNew = null;
  if (reach != null && impactNumeric != null) {
    if (confidenceNumeric != null && effortNumeric != null && effortNumeric > 0) {
      riceNew = (reach * impactNumeric * confidenceNumeric) / effortNumeric;
      core.info(
        `RICE computed as Reach * Impact * Confidence / Effort = ${riceNew}`
      );
    } else {
      riceNew = reach * impactNumeric;
      core.info(
        `RICE partially computed as Reach * Impact (missing Confidence/Effort) = ${riceNew}`
      );
    }
    await updateNumber(FIELD_IDS.RICE, riceNew, itemId);
  } else {
    core.info(
      "RICE was not computed because Reach or Impact are missing."
    );
  }

  // 11) Update Priority only if RICE changed
  if (riceNew != null && !Number.isNaN(riceNew)) {
    const epsilon = 1e-6;
    const riceWasMissing = riceExisting == null || Number.isNaN(riceExisting);
    const riceChanged =
      riceWasMissing || Math.abs(riceExisting - riceNew) > epsilon;

    if (riceChanged) {
      core.info(
        `RICE changed (old: ${riceExisting}, new: ${riceNew}). Updating Priority.`
      );
      const priorityOptionId = getPriorityOptionFromRice(riceNew);
      if (priorityOptionId) {
        await updateSingleSelect(FIELD_IDS.PRIORITY, priorityOptionId, itemId);
      } else {
        core.info("No Priority option found for this RICE value.");
      }
    } else {
      core.info(
        `RICE did not change (old: ${riceExisting}, new: ${riceNew}). Skipping Priority update.`
      );
    }
  } else {
    core.info("Skipping Priority update because new RICE is not available.");
  }

  // 12) Strip form sections from issue body after sync
  let newBody = body;

  function stripSection(label) {
    const escapedLabel = label.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&");
    const sectionRegex = new RegExp(
      "###\\s+" + escapedLabel + "[\\s\\S]*?(?=\\n###\\s+|$)",
      "g"
    );

    newBody = newBody.replace(sectionRegex, "").trim();
  }

  stripSection("🧩 Squad responsable");
  stripSection("⭐ NSM afectada");
  stripSection("🎯 OKR asociado");
  stripSection("📈 Reach estimado");
  stripSection("📊 Impact");
  stripSection("🔍 Confidence");
  stripSection("📦 Effort (Size)");

  if (newBody !== body) {
    await github.rest.issues.update({
      owner,
      repo,
      issue_number: issue.number,
      body: newBody,
    });
    core.info("Form sections stripped from issue body after sync.");
  }

  core.info(`Sync Initiative → Project completed for issue #${issue.number}.`);
};
