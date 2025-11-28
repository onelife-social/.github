module.exports = async ({ github, context, core }) => {
    const PROJECT_NUMBER = 9;
  
    const issue = context.payload.issue;
    const owner = context.repo.owner;
    const repo = context.repo.repo;
    const issueNumber = issue.number;
  
    // Fields to copy from parent to child (single-select fields)
    const FIELDS_TO_COPY = [
      {
        name: "Status",
        alias: "fieldStatus",
        fieldId: "PVTSSF_lADOB3GKus4AijmyzgbDmFs", // STATUS_FIELD_ID
      },
      {
        name: "Squad",
        alias: "fieldSquad",
        fieldId: "PVTSSF_lADOB3GKus4AijmyzgfJCPA", // SQUAD_FIELD_ID
      },
      {
        name: "Priority",
        alias: "fieldPriority",
        fieldId: "PVTSSF_lADOB3GKus4AijmyzgbDm2E", // PRIORITY_FIELD_ID
      },
      {
        name: "NSM",
        alias: "fieldNSM",
        fieldId: "PVTSSF_lADOB3GKus4Aijmyzg4OqYo", // NSM_FIELD_ID
      },
      {
        name: "OKR",
        alias: "fieldOKR",
        fieldId: "PVTSSF_lADOB3GKus4Aijmyzg4OsCs", // OKR_FIELD_ID
      },
    ];

    // Workflow Phase field (single-select) handled based on template/labels
    const WORKFLOW_PHASE_FIELD_ID = "PVTSSF_lADOB3GKus4Aijmyzg5QP-s"; // WF_FIELD_ID

    const WORKFLOW_PHASE_OPTIONS = {
      discovery: "041bb0d9", 
      design: "3fd8f8cd",
      implementation: "9fc55396",
      results: "509378eb",
    };

    // Helper to infer phase key from issue labels or title
    function inferWorkflowPhaseKey(issue) {
      const labels = (issue.labels || []).map((l) => l.name);

      // Match by labels first (recommended)
      if (labels.includes("🕵️ discovery 🔍") || labels.includes("📄 prd")) {
        return "discovery";
      }
      if (labels.includes("📊 resultados")) {
        return "results";
      }

      // Fallback: match by title prefix
      const title = issue.title || "";
      if (title.startsWith("[Discovery]")) return "discovery";
      if (title.startsWith("[PRD]")) return "discovery";
      if (title.startsWith("[R&L]")) return "results";

      return null;
    }

    // 1) Read parent_issue_url from payload
    const parentIssueUrl = issue.parent_issue_url;
    if (!parentIssueUrl) {
      core.info("No parent_issue_url in payload. Nothing to copy.");
      return;
    }
  
    const parts = parentIssueUrl.split("/");
    const parentIssueNumber = parseInt(parts[parts.length - 1], 10);
  
    if (isNaN(parentIssueNumber)) {
      core.info(`Could not parse parent issue number from URL: ${parentIssueUrl}`);
      return;
    }
  
    core.info(`Parent issue detected: #${parentIssueNumber}`);
  
    // 2) Get child project item (this issue) in Project V2
    const issueQuery = `
      query($owner:String!, $repo:String!, $number:Int!) {
        repository(owner:$owner, name:$repo) {
          issue(number:$number) {
            id
            projectItems(first: 20) {
              nodes {
                id
                project {
                  __typename
                  ... on ProjectV2 {
                    id
                    number
                    title
                  }
                }
              }
            }
          }
        }
      }
    `;
  
    const issueData = await github.graphql(issueQuery, {
      owner,
      repo,
      number: issueNumber,
    });
  
    const issueNode = issueData.repository.issue;
  
    const childProjectItem = issueNode.projectItems.nodes.find(
      (item) =>
        item.project &&
        item.project.__typename === "ProjectV2" &&
        item.project.number === PROJECT_NUMBER
    );
  
    if (!childProjectItem) {
      core.info(`Child issue is not in Project ${PROJECT_NUMBER}. Nothing to do.`);
      return;
    }
  
    // 3) Get parent project item in the same Project
    const parentQuery = `
      query($owner:String!, $repo:String!, $number:Int!) {
        repository(owner:$owner, name:$repo) {
          issue(number:$number) {
            id
            projectItems(first: 20) {
              nodes {
                id
                project {
                  __typename
                  ... on ProjectV2 {
                    id
                    number
                    title
                  }
                }
              }
            }
          }
        }
      }
    `;
  
    const parentData = await github.graphql(parentQuery, {
      owner,
      repo,
      number: parentIssueNumber,
    });
  
    const parentIssueNode = parentData.repository.issue;
  
    const parentProjectItem = parentIssueNode.projectItems.nodes.find(
      (item) =>
        item.project &&
        item.project.__typename === "ProjectV2" &&
        item.project.number === PROJECT_NUMBER
    );
  
    if (!parentProjectItem) {
      core.info(`Parent issue is not in Project ${PROJECT_NUMBER}. Nothing to copy.`);
      return;
    }
  
    const projectId = childProjectItem.project.id;
    const childItemId = childProjectItem.id;
    const parentItemId = parentProjectItem.id;
  
    core.info(`Project ID: ${projectId}`);
    core.info(`Parent item ID: ${parentItemId}`);
    core.info(`Child  item ID: ${childItemId}`);
  
    // 4) Read parent fields generically based on FIELDS_TO_COPY
    const parentFieldSelections = FIELDS_TO_COPY.map(
      (f) => `
        ${f.alias}: fieldValueByName(name: "${f.name}") {
          __typename
          ... on ProjectV2ItemFieldSingleSelectValue {
            optionId
            name
          }
        }
      `
    ).join("\n");
  
    const parentFieldsQuery = `
      query($parentItemId:ID!) {
        node(id: $parentItemId) {
          ... on ProjectV2Item {
            ${parentFieldSelections}
          }
        }
      }
    `;
  
    const parentFieldsData = await github.graphql(parentFieldsQuery, {
      parentItemId,
    });
  
    const parentFields = parentFieldsData.node;
  
    // 5) Read child fields so we can avoid overwriting existing values
    const childFieldSelections = FIELDS_TO_COPY.map(
      (f) => `
        ${f.alias}: fieldValueByName(name: "${f.name}") {
          __typename
          ... on ProjectV2ItemFieldSingleSelectValue {
            optionId
            name
          }
        }
      `
    ).join("\n");
  
    const childFieldsQuery = `
      query($childItemId:ID!) {
        node(id: $childItemId) {
          ... on ProjectV2Item {
            ${childFieldSelections}
          }
        }
      }
    `;
  
    const childFieldsData = await github.graphql(childFieldsQuery, {
      childItemId,
    });
  
    const childFields = childFieldsData.node;
  
    // Generic mutation for updating any single-select field
    const mutation = `
      mutation(
        $projectId:ID!,
        $itemId:ID!,
        $fieldId:ID!,
        $optionId:String!
      ) {
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
    `;
  
    // 6) Copy all fields defined in FIELDS_TO_COPY, but only if child has no value yet
    for (const fieldConfig of FIELDS_TO_COPY) {
      const { name, alias, fieldId } = fieldConfig;
  
      const parentValue = parentFields[alias];
      const childValue = childFields[alias];
  
      // Parent has no value → skip
      if (
        !parentValue ||
        parentValue.__typename !== "ProjectV2ItemFieldSingleSelectValue"
      ) {
        core.info(`Skipping "${name}" → parent has no value.`);
        continue;
      }
  
      // Child already has a value → do not overwrite
      if (
        childValue &&
        childValue.__typename === "ProjectV2ItemFieldSingleSelectValue"
      ) {
        core.info(
          `Skipping "${name}" → child already has value "${childValue.name}".`
        );
        continue;
      }
  
      core.info(`Copying "${name}" → setting "${parentValue.name}".`);
  
      await github.graphql(mutation, {
        projectId,
        itemId: childItemId,
        fieldId,
        optionId: parentValue.optionId,
      });
    }

    // 7) Set Workflow Phase based on template/labels (not copied from parent)
    const phaseKey = inferWorkflowPhaseKey(issue);

    if (!phaseKey) {
      core.info("No workflow phase inferred from labels/title. Skipping Workflow Phase update.");
      core.info("Labels present: " + (issue.labels || []).map((l) => l.name).join(", "));
      return;
    }

    const workflowPhaseOptionId = WORKFLOW_PHASE_OPTIONS[phaseKey];

    if (!workflowPhaseOptionId) {
      core.info(
        `No Workflow Phase option ID configured for phase key "${phaseKey}". Check WORKFLOW_PHASE_OPTIONS.`
      );
      return;
    }

    core.info(`Inferred workflow phase "${phaseKey}". Updating Workflow Phase field.`);

    // Optionally, we could check if child already has a Workflow Phase and skip
    // For now, we always set it based on the template used.
    await github.graphql(mutation, {
      projectId,
      itemId: childItemId,
      fieldId: WORKFLOW_PHASE_FIELD_ID,
      optionId: workflowPhaseOptionId,
    });
  
    core.info("Done copying configured single-select fields from parent to child (only empty ones).");
  };
  