const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Serve Static HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const STORY_POINT_FIELD = "customfield_10111";
const DISCIPLINE_FIELD = "customfield_10524";
const EXPLANATION_FIELD = "customfield_10203";

app.post("/test-auth", async (req, res) => {
  const { baseUrl, username, password } = req.body;
  const auth = Buffer.from(`${username}:${password}`).toString("base64");

  try {
    const resp = await axios.get(`${baseUrl}/rest/api/2/myself`, {
      headers: { Authorization: `Basic ${auth}` }
    });
    res.json({ success: true, user: resp.data.displayName });
  } catch (err) {
    console.error("Auth error:", err.message);
    res.status(401).json({ error: "Kimlik doğrulama başarısız. Bilgilerinizi kontrol edin.", details: err.message });
  }
});

app.post("/sprints", async (req, res) => {
  const { baseUrl, username, password, boardId } = req.body;
  const auth = Buffer.from(`${username}:${password}`).toString("base64");

  try {
    const resp = await axios.get(
      `${baseUrl}/rest/agile/1.0/board/${boardId}/sprint?maxResults=100`,
      { headers: { Authorization: `Basic ${auth}` } }
    );

    let sprints = resp.data.values || [];
    // Sprint başlama tarihine (startDate) göre azalan sıralama (En yeniler en üstte)
    sprints.sort((a, b) => {
      let dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
      let dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
      return dateB - dateA;
    });

    res.json(sprints);
  } catch (err) {
    console.error("Sprint listesi çekilirken hata:", err.message);
    res.status(500).json({ error: "Sprint fetch error", details: err.message });
  }
});

app.post("/sprint-report", async (req, res) => {
  const { baseUrl, username, password, sprintId, boardId } = req.body;
  const auth = Buffer.from(`${username}:${password}`).toString("base64");

  try {
    // Sprint detayları
    const sprintResp = await axios.get(
      `${baseUrl}/rest/agile/1.0/sprint/${sprintId}`,
      { headers: { Authorization: `Basic ${auth}` } }
    );
    const sprint = sprintResp.data;
    //console.log(`SprintData:`, sprint);
    const sprintStart = new Date(sprint.startDate);
    const sprintEnd = new Date(sprint.endDate);
    const sprintActiveTime = sprint.activatedDate ? new Date(sprint.activatedDate).getTime() : sprintStart.getTime();

    // Yardımcı Fonksiyon: İşin bu sprinte ne zaman eklendiğini bulup, sprintin aktifleşme zamanından (activatedDate) sonra eklendiyse true ("Emerged") döner.
    function checkIsEmerged(issue) {
      const createdDate = new Date(issue.fields.created).getTime();
      let addedToSprintDate = null;

      if (issue.changelog && issue.changelog.histories) {
        let addedEvents = [];
        issue.changelog.histories.forEach(history => {
          let date = new Date(history.created).getTime();
          history.items.forEach(item => {
            if (item.field === 'Sprint') {
              const toStr = item.toString || "";
              // Sprint name veya Id içeriyorsa, bu sprinte eklenme eventidir
              if (toStr.includes(sprint.name) || toStr.includes(sprintId.toString())) {
                addedEvents.push(date);
              }
            }
          });
        });
        if (addedEvents.length > 0) {
          addedEvents.sort((a, b) => a - b);
          addedToSprintDate = addedEvents[0]; // İlk eklenme anı
        }
      }

      if (addedToSprintDate !== null) {
        return addedToSprintDate > sprintActiveTime;
      }
      return createdDate > sprintActiveTime;
    }

    // Sprint issue’ları (Current)
    const issuesResp = await axios.get(
      `${baseUrl}/rest/agile/1.0/sprint/${sprintId}/issue?maxResults=500&expand=changelog&fields=assignee,status,labels,created,summary,resolutiondate,issuetype,priority,timetracking,${STORY_POINT_FIELD},${DISCIPLINE_FIELD},${EXPLANATION_FIELD}`,
      { headers: { Authorization: `Basic ${auth}` } }
    );
    const issues = issuesResp.data.issues;

    // Takım ve Scrum Master Bilgisi
    const teamList = [
      { teamNo: 3, scrumMaster: "Osman Sokuoğlu", team: "EKAP TEAM 3" },
      { teamNo: 1, scrumMaster: "Yunus Sevinç", team: "EKAP TEAM 1" },
      { teamNo: 2, scrumMaster: "Ebuzer Mert Kahveci", team: "EKAP TEAM 2" },
      { teamNo: 4, scrumMaster: "İsmail Tatlı", team: "EKAP TEAM 4" },
      { teamNo: 5, scrumMaster: "Melahat Emel Yücekaya", team: "EKAP TEAM 5" },
    ];

    let scrumMasterName = "---";
    let developmentTeamName = "EKAP TEAM -";
    let foundTeamNo = null;

    // Sprint adından takım numarasını tahmin etme (Örn: "Takım 3 Sprint", "Takım_4_", "EkapTeam3", "Takım3 Sprint")
    const sprintNameLower = (sprint.name || "").toLowerCase();
    const teamMatch = sprintNameLower.match(/tak[ıi]m[_\s]*(\d+)|team[_\s]*(\d+)/i);

    if (teamMatch) {
      foundTeamNo = parseInt(teamMatch[1] || teamMatch[2], 10);
    }

    if (foundTeamNo) {
      const matched = teamList.find(t => t.teamNo === foundTeamNo);
      if (matched) {
        scrumMasterName = matched.scrumMaster;
        developmentTeamName = matched.team;
      }
    }

    // Burndown için tüm tarihçe (Removed dahil)
    // Burndown için tüm tarihçe (Removed issue'ları desteklenmiyorsa sadece mevcutları alıyoruz)
    // NOT: "sprint was" operatörü her Jira sürümünde desteklenmez. Desteklenmiyorsa 400 döner.
    // Bu yüzden güvenli olarak "sprint =" kullanıyoruz.
    const historyJql = `sprint = ${sprintId}`;
    const historyResp = await axios.get(
      `${baseUrl}/rest/api/2/search?jql=${encodeURIComponent(historyJql)}&maxResults=1000&expand=changelog&fields=summary,created,resolutiondate,issuetype,${STORY_POINT_FIELD},${DISCIPLINE_FIELD}`,
      { headers: { Authorization: `Basic ${auth}` } }
    );
    const allIssues = historyResp.data.issues;

    let puntedIssueKeys = [];
    try {
      if (boardId) {
        const sprintReportResp = await axios.get(
          `${baseUrl}/rest/greenhopper/1.0/rapid/charts/sprintreport?sprintId=${sprintId}&rapidViewId=${boardId}`,
          { headers: { Authorization: `Basic ${auth}` } }
        );
        const punted = sprintReportResp.data.contents?.puntedIssues || [];
        puntedIssueKeys = punted.map(i => i.key);

        if (puntedIssueKeys.length > 0) {
          const puntedJql = `issuekey in (${puntedIssueKeys.join(',')})`;
          const puntedResp = await axios.get(
            `${baseUrl}/rest/api/2/search?jql=${encodeURIComponent(puntedJql)}&maxResults=1000&expand=changelog&fields=summary,created,resolutiondate,issuetype,${STORY_POINT_FIELD},${DISCIPLINE_FIELD}`,
            { headers: { Authorization: `Basic ${auth}` } }
          );
          puntedResp.data.issues.forEach(pi => {
            if (!allIssues.find(i => i.key === pi.key)) {
              allIssues.push(pi);
            }
          });
        }
      }
    } catch (err) {
      console.warn("Could not fetch punted issues:", err.message);
    }

    const abc = allIssues.find(a => a.key == "EKAP-25764");

    // Metriği tutacaklar
    let committedSP = 0;
    let emergedSP = 0;
    let doneSP = 0;

    // Breakdown Counters
    let gelistirmeSP = 0; // Group 1+2
    let bakimSP = 0;      // Group 4
    let digerSP = 0;      // Group 5+6

    // Issue Type Counts (Dynamic)
    const issueTypeCounts = {};

    // Workload / Timetracking Breakdown
    const workloadMap = {};

    // Helper to find true resolver from changelog
    function findResolver(issue) {
      if (!issue.changelog || !issue.changelog.histories) return issue.fields.assignee ? issue.fields.assignee.displayName : "Unassigned";

      let resolver = null;
      issue.changelog.histories.forEach(history => {
        history.items.forEach(item => {
          if (item.field === "status") {
            const statusName = item.toString;
            if (statusName.toLowerCase() === "resolved") {
              resolver = history.author.displayName;
            } else if (statusName.toLowerCase() === "done" && !resolver) {
              resolver = history.author.displayName;
            }
          }
        });
      });

      return resolver || (issue.fields.assignee ? issue.fields.assignee.displayName : "Unassigned");
    }

    // Assignee Breakdown & Matrix
    const assigneeBreakdown = {};
    const assigneeDetailed = {};
    const allIssueTypes = new Set();

    // UI için liste
    const issueList = [];
    issues.forEach(issue => {
      const fields = issue.fields;
      const sp = fields[STORY_POINT_FIELD] || 0;
      const typeName = fields.issuetype ? fields.issuetype.name : "Unknown";
      const disciplineVal = fields[DISCIPLINE_FIELD] ? fields[DISCIPLINE_FIELD].value : "";
      const explanation = fields[EXPLANATION_FIELD] || "";
      const timeSpentSec = fields.timetracking ? (fields.timetracking.timeSpentSeconds || 0) : 0;

      const realAssignee = findResolver(issue);
      const isEmerged = checkIsEmerged(issue);
      const isDone = fields.status && fields.status.statusCategory && fields.status.statusCategory.name === "Done";
      const isPunted = puntedIssueKeys.includes(issue.key);

      // DETERMINE GROUP (1-6)
      let group = 0;
      const summaryLower = fields.summary.toLowerCase();

      if (typeName === 'Task' && disciplineVal === 'Development') {
        group = 1;
      } else if (typeName === 'Task' && disciplineVal === 'Test') {
        group = 2;
      } else if (typeName === 'Test Execution' || typeName === 'Test') {
        group = 3;
      } else if ((typeName === 'NonconformityReport' || typeName === 'NCR')) {
        group = 4;
      } else if (typeName === 'Task' && disciplineVal === 'Management') {
        if (summaryLower.includes('incident destek') || summaryLower.includes('ncident destek')) {
          group = 6;
        } else {
          group = 5;
        }
      }

      // --- CALCULATIONS BASED ON GROUPS ---

      // Filter: Metrics (Committed, Emerged, etc.) only consider Groups 1, 2, 3, 4
      const isMetricTask = [1, 2, 3, 4].includes(group);

      if (isMetricTask) {
        if (!isPunted) {
          committedSP += sp; // COMMITTED = [1+2+3+4] (Total Scope of interest)

          if (isEmerged) {
            emergedSP += sp; // EMERGED = [1+2+3+4] added after start
          }
        }

        if (fields.status && (fields.status.name === "Resolved" || fields.status.name === "Done" || fields.status.name === "Completed" || fields.status.name === "Verified" || fields.status.name === "Closed")) {
          // User definition: "Done => Committed ve Emerged da olup statüsü Resolved olanlar"
          doneSP += sp;
        }
      }

      // Breakdown Categories (Independent of MetricTask filter?)
      // User said: "Geliştirme => [1+2]". "Bakım => 4". "Diğer => 5+6".
      // Innovation Rate: "Geliştirme / Done * 100".
      // This implies Geliştirme is DONE Geliştirme.

      if (isDone || (fields.status && fields.status.name === "Resolved")) {
        // Geliştirme => [1+2]
        if (group === 1 || group === 2) {
          gelistirmeSP += sp;
        }

        // Bakım & Destek => [4]
        if (group === 4) {
          bakimSP += sp;
        }

        // Diğer => [5+6]
        if (group === 5 || group === 6) {
          digerSP += sp;
        }
      }

      // Count Issue Types (All types)
      issueTypeCounts[typeName] = (issueTypeCounts[typeName] || 0) + 1;

      // Assignee Breakdown (All types, using real resolver)
      assigneeBreakdown[realAssignee] = (assigneeBreakdown[realAssignee] || 0) + sp;
      if (!assigneeDetailed[realAssignee]) assigneeDetailed[realAssignee] = { total: 0 };
      assigneeDetailed[realAssignee][typeName] = (assigneeDetailed[realAssignee][typeName] || 0) + sp;
      assigneeDetailed[realAssignee].total += sp;

      // Calculate Workload Breakdown
      const spLabel = sp > 0 ? "(SP>0)" : "(SP<=0)";
      const workloadKey = `${typeName}_${sp > 0 ? 'GT0' : 'LTE0'}`;
      if (!workloadMap[workloadKey]) {
        workloadMap[workloadKey] = {
          label: `${typeName} ${spLabel}`,
          typeName: typeName,
          isGtZero: sp > 0,
          count: 0,
          timeSpentSec: 0
        };
      }
      workloadMap[workloadKey].count += 1;
      workloadMap[workloadKey].timeSpentSec += timeSpentSec;

      allIssueTypes.add(typeName);

      issueList.push({
        key: issue.key,
        summary: fields.summary,
        issuetype: typeName,
        issuetypeIcon: fields.issuetype ? fields.issuetype.iconUrl : "",
        priority: fields.priority ? fields.priority.name : "",
        priorityIcon: fields.priority ? fields.priority.iconUrl : "",
        status: fields.status ? fields.status.name : "",
        sp: sp,
        timeSpentHours: timeSpentSec > 0 ? Math.round(timeSpentSec / 3600) : 0,
        assignee: realAssignee,
        isEmerged: isEmerged,
        isPunted: isPunted,
        group: group,
        explanation: explanation
      });
    });

    // Handle Punted Issues Metrics separately since we only loop `issues` array which doesnt always have punted
    let removedSP = 0;
    allIssues.forEach(pi => {
      if (puntedIssueKeys.includes(pi.key)) {
        const fields = pi.fields;
        const sp = fields[STORY_POINT_FIELD] || 0;
        const typeName = fields.issuetype ? fields.issuetype.name : "Unknown";
        const disciplineVal = fields[DISCIPLINE_FIELD] ? fields[DISCIPLINE_FIELD].value : "";
        let group = 0;
        if (typeName === 'Task' && disciplineVal === 'Development') group = 1;
        else if (typeName === 'Task' && disciplineVal === 'Test') group = 2;
        else if (typeName === 'Test Execution' || typeName === 'Test') group = 3;
        else if (typeName === 'NonconformityReport' || typeName === 'NCR') group = 4;

        const isEmerged = checkIsEmerged(pi);

        // If it's a metric task, check its timelines
        if ([1, 2, 3, 4].includes(group)) {
          // We need to know if it was pre-sprint or post-sprint to add to Committed or Emerged
          if (!isEmerged) {
            committedSP += sp;
          } else {
            emergedSP += sp;
          }
          removedSP += sp;
        }

        // Punted issues da breakdown'a (geliştirme/bakım/diğer vb.) eklenecekse:
        // Eğer status 'Done' veya 'Resolved' ise (yani başka bir yerde/sprintte çözülmüşse) 
        // user'ın beklentisine göre dağılıma dâhil ediyoruz.
        if (fields.status && (fields.status.name === "Resolved" || fields.status.name === "Done" || fields.status.name === "Completed")) {
          doneSP += sp; // Çıkartılan görev yapıldıysa done kabul edeceğiz
          if (group === 1 || group === 2) {
            gelistirmeSP += sp;
          }
          if (group === 4) {
            bakimSP += sp;
          }
          if (group === 5 || group === 6) {
            digerSP += sp;
          }
        }

        // Add to issueList if not already there (issues endpoint might not return removed ones)
        if (!issueList.find(i => i.key === pi.key)) {
          issueList.push({
            key: pi.key,
            summary: fields.summary,
            issuetype: typeName,
            issuetypeIcon: fields.issuetype ? fields.issuetype.iconUrl : "",
            priority: fields.priority ? fields.priority.name : "",
            priorityIcon: fields.priority ? fields.priority.iconUrl : "",
            status: fields.status ? fields.status.name : "",
            sp: sp,
            timeSpentHours: fields.timetracking ? Math.round((fields.timetracking.timeSpentSeconds || 0) / 3600) : 0,
            assignee: findResolver(pi),
            isEmerged: isEmerged,
            isPunted: true,
            group: group,
            explanation: fields[EXPLANATION_FIELD] || ""
          });
        }
      }
    });

    // Recalc Metrics
    const initialCommitted = committedSP - emergedSP;

    let undoneSP = 0;
    if (sprint.state === 'active') { // Check if sprint is active
      try {
        // "sprint was ... AND sprint != ..." removed issue mantığı "was" desteklenmediğinde çalışmaz.
        // Şimdilik bu özelliği devre dışı bırakıyoruz veya alternatif bakıyoruz.
        // const removedJql = `sprint was ${sprintId} AND sprint != ${sprintId}`;

        // Eğer "was" desteklenmiyorsa removed issue'ları burndown'a dahil edemeyiz (basit JQL ile).
        // Bu bloğu şimdilik pas geçiyoruz.

        // const removedResp = await axios.get(
        //   `${baseUrl}/rest/api/2/search?jql=${encodeURIComponent(removedJql)}&fields=${STORY_POINT_FIELD}`,
        //   { headers: { Authorization: `Basic ${auth}` } }
        // );
        // removedResp.data.issues.forEach(issue => {
        //   const sp = issue.fields[STORY_POINT_FIELD] || 0;
        //   undoneSP += sp;
        // });
        undoneSP = removedSP;
      } catch (err) {
        console.error("Error fetching removed issues:", err.message);
      }
    } else {
      // Undone = (Committed + Emerged) - Done - Removed
      undoneSP = committedSP - doneSP;
    }

    // Innovation Rate => Geliştirme / Done * 100
    const innovationRate = doneSP ? (gelistirmeSP / doneSP) * 100 : 0;

    // Scope Creep Rate
    const scopeCreepRate = committedSP ? (emergedSP / committedSP) * 100 : 0;

    // Convert Set to Array and Sort
    const sortedIssueTypes = Array.from(allIssueTypes).sort();

    // Sort Assignees by SP (Desc)
    const sortedAssignees = Object.entries(assigneeBreakdown)
      .sort(([, a], [, b]) => b - a)
      .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});



    // Process Workload Report
    let workloadReport = Object.values(workloadMap);
    workloadReport.forEach(w => {
      w.timeSpentHours = Math.round(w.timeSpentSec / 3600);
    });
    // Sort by typeName, then by isGtZero descending (so >0 comes first)
    workloadReport.sort((a, b) => {
      if (a.typeName < b.typeName) return -1;
      if (a.typeName > b.typeName) return 1;
      return (a.isGtZero === b.isGtZero) ? 0 : a.isGtZero ? -1 : 1;
    });

    // --- SPRINT BURNDOWN DEBUG LOGGING ---
    console.log(`\n========== SPRINT BURNDOWN DEBUG LOG ==========`);
    console.log(`Sprint: ${sprint.name} (${sprintId})`);
    console.log(`Start: ${sprintStart.toISOString()}`);
    console.log(`End: ${sprintEnd.toISOString()}`);

    let timelineEvents = [];
    let initialSprintSP = 0;

    allIssues.forEach(issue => {
      const fields = issue.fields;
      const typeName = fields.issuetype ? fields.issuetype.name : "Unknown";
      const disciplineVal = fields[DISCIPLINE_FIELD] ? fields[DISCIPLINE_FIELD].value : "";
      const summaryLower = fields.summary.toLowerCase();

      let group = 0;
      if (typeName === 'Task' && disciplineVal === 'Development') group = 1;
      else if (typeName === 'Task' && disciplineVal === 'Test') group = 2;
      else if (typeName === 'Test Execution' || typeName === 'Test') group = 3;
      else if (typeName === 'NonconformityReport' || typeName === 'NCR') group = 4;
      else if (typeName === 'Task' && disciplineVal === 'Management' && summaryLower.includes('plansız işler')) {
        group = (summaryLower.includes('incident destek') || summaryLower.includes('ncident destek')) ? 6 : 5;
      }

      if (![1, 2, 3, 4].includes(group)) return;

      let currentSP = fields[STORY_POINT_FIELD] || 0;
      let createdDate = new Date(fields.created);
      let events = [];

      if (issue.changelog && issue.changelog.histories) {
        issue.changelog.histories.forEach(h => {
          let date = new Date(h.created);
          h.items.forEach(item => {
            if (item.field === 'Sprint') {
              const toStr = item.to || item.toString || "";
              const fromStr = item.from || item.fromString || "";
              const sID = String(sprintId);

              // Eklendi mi? (Eskiden yoktu veya başka bir şeydi, şimdi bu sprinte eklendi)
              if (!fromStr.includes(sID) && (toStr.includes(sID) || (sprint.name && toStr.includes(sprint.name)))) {
                events.push({ date, type: 'Sprint Add', key: issue.key, details: `Added to sprint`, spEffect: currentSP });
              }
              // Çıkartıldı mı (Önceden vardı, şimdi bu sprint çıkarıldı)
              if ((fromStr.includes(sID) || (sprint.name && fromStr.includes(sprint.name))) && !toStr.includes(sID)) {
                events.push({ date, type: 'Sprint Remove', key: issue.key, details: `Removed from sprint`, spEffect: -currentSP });
              }
            } else if (item.fieldId === STORY_POINT_FIELD || (item.field && item.field.toLowerCase().includes('story point'))) {
              const fromSP = parseFloat(item.fromString) || 0;
              const toSP = parseFloat(item.toString) || 0;
              events.push({ date, type: 'SP Change', key: issue.key, spDiff: toSP - fromSP, details: `SP: ${fromSP} -> ${toSP}` });
            } else if (item.field === 'status') {
              const toName = item.toString ? item.toString.toLowerCase() : "";
              const fromName = item.fromString ? item.fromString.toLowerCase() : "";
              const doneStates = ["resolved", "done", "completed", "closed", "verified", "kapalı", "çözüldü"];

              const isToDone = doneStates.some(s => toName === s);
              const isFromDone = doneStates.some(s => fromName === s);

              // Eğer daha önce bitmemiş (done değil) bir iş, done (resolved vb.) statüye geçtiyse:
              if (isToDone && !isFromDone) {
                events.push({ date, type: 'Resolved', key: issue.key, details: `Status: ${item.toString}` });
              }
              // Eğer daha önce bitmiş (done) olan iş, tekrar aktif bir statüye geri çekildiyse:
              else if (!isToDone && isFromDone) {
                events.push({ date, type: 'Reopened', key: issue.key, details: `Status: ${item.fromString} -> ${item.toString}` });
              }
              // Resolved -> Closed gibi aynı taraftaki geçişlerde 아무 event eklenmez, SP değişmez.
            }
          });
        });
      }

      events.sort((a, b) => a.date - b.date);

      let spAtStart = currentSP;
      let spChangesAfterStart = events.filter(e => e.type === 'SP Change' && e.date > sprintStart);
      for (let i = spChangesAfterStart.length - 1; i >= 0; i--) {
        spAtStart -= spChangesAfterStart[i].spDiff;
      }

      let inSprintAtStart = true;
      let sprintAddEvents = events.filter(e => ['Sprint Add', 'Sprint Remove'].includes(e.type));
      if (sprintAddEvents.length > 0) {
        if (sprintAddEvents[0].type === 'Sprint Add' && sprintAddEvents[0].date > sprintStart) {
          inSprintAtStart = false;
        }
      } else {
        if (createdDate > sprintStart) {
          inSprintAtStart = false;
        }
      }

      if (inSprintAtStart) {
        initialSprintSP += spAtStart;
      }

      events.forEach(e => {
        if (e.date >= sprintStart && e.date <= sprintEnd) {
          timelineEvents.push(e);
        }
      });
      if (!inSprintAtStart && createdDate >= sprintStart && createdDate <= sprintEnd) {
        let addedDuringSprint = events.some(e => e.type === 'Sprint Add' && e.date >= sprintStart && e.date <= sprintEnd);
        if (!addedDuringSprint) {
          timelineEvents.push({ date: createdDate, type: 'Created (in Spr)', key: issue.key, details: `Created with SP: ${spAtStart}`, spEffect: spAtStart });
        }
      }
    });

    timelineEvents.sort((a, b) => a.date - b.date);

    let currentSprintSP = initialSprintSP;
    const sprintDurationMs = sprintEnd.getTime() - sprintStart.getTime();

    // Chart verileri artık tüm olaylar (timelineEvents) işlendikten sonra `burndownAuditLog` üzerinden günlük (day-by-day) inşa edilecek.
    let burndownAuditLog = [];

    // Geçmişteki statüsü bilinen ve Resolved olanların SP miktarını tutalım.
    timelineEvents.forEach(e => {
      let spEffect = e.spDiff || e.spEffect || 0;
      let spChanged = false;

      // Sadece SP miktarını değiştiren olaylar veya Durum değişikliklerinde currentSprintSP'yi güncelle
      if (e.type === 'Sprint Add') {
        // Find final SP
        let issueSP = allIssues.find(i => i.key === e.key)?.fields[STORY_POINT_FIELD] || 0;
        // Subtract all SP Changes that happened AFTER this Sprint Add event to find out what the SP was at this exact moment
        let spChangesAfter = timelineEvents.filter(t => t.key === e.key && t.type === 'SP Change' && t.date > e.date);
        for (let change of spChangesAfter) {
          issueSP -= change.spDiff;
        }
        spEffect = issueSP; // It was added with THIS amount of SP
        currentSprintSP += spEffect;
        spChanged = true;
      } else if (e.type === 'Sprint Remove') {
        let issueSP = allIssues.find(i => i.key === e.key)?.fields[STORY_POINT_FIELD] || 0;
        let spChangesAfter = timelineEvents.filter(t => t.key === e.key && t.type === 'SP Change' && t.date > e.date);
        for (let change of spChangesAfter) {
          issueSP -= change.spDiff;
        }
        spEffect = -issueSP; // It was removed holding THIS amount of SP
        currentSprintSP += spEffect;
        spChanged = true;
      } else if (e.type === 'Created (in Spr)') {
        currentSprintSP += spEffect; // Uses initial SP passed from log
        spChanged = true;
      } else if (e.type === 'SP Change') {
        let issueAddLogs = burndownAuditLog.filter(l => l.key === e.key && (l.type === 'Sprint Add' || l.type === 'Created (in Spr)'));
        let isRemoved = burndownAuditLog.filter(l => l.key === e.key && l.type === 'Sprint Remove').length > 0;

        if (issueAddLogs.length == 0) {
          issueAddLogs = timelineEvents.filter(t => t.key === e.key && (t.type === 'Sprint Add' || t.type === 'Created (in Spr)'));
        }

        if (issueAddLogs.length === 0) {
          // ISSUE HAS NOT BEEN ADDED TO SPRINT YET (Pre-Sprint addition change)
          // spEffect = 0;
          e.isPreSprint = true; // Flag for frontend highlighting
          e.details += ' (Sprint öncesi)';
        } else if (issueAddLogs.length > 0 && !isRemoved) {
          let totalAdded = issueAddLogs.reduce((sum, l) => sum + l.spEffect, 0);
          let totalSpChanges = burndownAuditLog.filter(l => l.key === e.key && l.type === 'SP Change').reduce((sum, l) => sum + l.spEffect, 0);
          let accumulatedSP = totalAdded + totalSpChanges;

          let toSPMatch = e.details.match(/->\s*([\d.]+)/);
          if (toSPMatch) {
            let targetSP = parseFloat(toSPMatch[1]);
            spEffect = targetSP - accumulatedSP;
          } else {
            spEffect = e.spDiff;
          }
        } else {
          spEffect = e.spDiff;
        }

        currentSprintSP += spEffect;
        spChanged = true;
      } else if (e.type === 'Resolved') {
        let issueSP = allIssues.find(i => i.key === e.key)?.fields[STORY_POINT_FIELD] || 0;
        spEffect = -issueSP;
        currentSprintSP += spEffect;
        spChanged = true;
      } else if (e.type === 'Reopened') {

        let issueSP = allIssues.find(i => i.key === e.key)?.fields[STORY_POINT_FIELD] || 0;
        let spChangesAfter = timelineEvents.filter(t => t.key === e.key && (t.type === 'SP Change' || t.type === 'Sprint Add') && t.date > e.date);
        for (let change of spChangesAfter) {
          issueSP -= (change.spDiff || change.spEffect || 0);
        }


        spEffect = issueSP;
        currentSprintSP += spEffect;
        spChanged = true;
      }

      if (spChanged) {
        let logSpStr = spEffect ? `(${spEffect > 0 ? '+' : ''}${spEffect} SP)` : '';
        let logLine = `[${e.date.toISOString()}] ${e.key.padEnd(10)} | ${e.type.padEnd(15)} | ${e.details.padEnd(25)} ${logSpStr.padEnd(10)} | Total SP: ${currentSprintSP}`;
        // console.log(logLine);

        burndownAuditLog.push({
          date: e.date.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          key: e.key,
          type: e.type,
          details: e.details,
          spEffect: spEffect,
          totalSP: currentSprintSP,
          isPreSprint: e.isPreSprint || false,
          rawDate: e.date,
          isPunted: puntedIssueKeys.includes(e.key)
        });
      }
    });

    // --- DAY-BASED CHART DATA PREP ---
    let chartLabels = [];
    let actualChartData = [];
    let idealChartData = [];
    let chartTooltips = [];

    // Takvim günlerini hesapla (Başlangıç gününden bitiş gününe kadar her 4 saat için 1 adım)
    let calStart = new Date(sprintStart);
    calStart.setHours(Math.floor(calStart.getHours() / 4) * 4, 0, 0, 0);

    let calEnd = new Date(sprintEnd);

    // Total number of 4-hour intervals
    let sprintIntervalsCount = Math.ceil((calEnd - calStart) / (1000 * 60 * 60 * 4));
    if (sprintIntervalsCount < 1) sprintIntervalsCount = 1;

    let runningSP = initialSprintSP; // Starts at initial added SP
    let now = new Date();
    let isSprintClosed = (now > sprintEnd || sprint.state === 'closed');

    // Kullanıcı İsteği: Sprint'in gerçekten başlatıldığı andaki SP değerini bul.
    let sprintActiveSP = initialSprintSP; // Fallback
    for (let log of burndownAuditLog) {
      if (log.rawDate.getTime() <= sprintActiveTime) {
        if (!log.isPreSprint) { // Sadece hesaba katılanları baz al
          sprintActiveSP = log.totalSP;
        }
      } else {
        break; // Loglar tarih sıralı olduğu için sonrasına bakmaya gerek yok
      }
    }

    // Fonksiyon: İki tarih arasındaki sadece hafta içi süreyi (milisaniye olarak) hesaplar.
    function getWorkingMs(startDateVal, endDateVal) {
      let start = typeof startDateVal === 'number' ? new Date(startDateVal) : startDateVal;
      let end = typeof endDateVal === 'number' ? new Date(endDateVal) : endDateVal;
      if (start >= end) return 0;
      let ms = 0;
      let cur = new Date(start);
      while (cur < end) {
        let next = new Date(cur);
        next.setHours(24, 0, 0, 0); // Sonraki günün başına git
        if (next > end) next = new Date(end); // Bitiş sınırını aşmamak için

        let day = cur.getDay(); // 0: Pazar, 6: Cumartesi
        if (day !== 0 && day !== 6) {
          ms += (next - cur); // Sadece haftaiçiyse o gün içindeki geçerli milisaniyeyi ekle
        }
        cur = next;
      }
      return ms;
    }

    let sprintActiveTimeObj = new Date(sprintActiveTime);
    let totalWorkingDuration = getWorkingMs(sprintActiveTimeObj, calEnd);

    let lastPrintedDateLabel = "";
    let isWeekendData = [];

    // Her bir periyot için X ekseninde nokta oluştur
    for (let i = 0; i <= sprintIntervalsCount; i++) {
      let currentIntervalStart = new Date(calStart.getTime() + i * 4 * 60 * 60 * 1000);
      let currentIntervalEnd = new Date(currentIntervalStart.getTime() + 4 * 60 * 60 * 1000 - 1);

      // X Ekseni Etiketi: Frontend'e tüm veriyi yolla, ayıklaması orada yapılacak.
      let hr = currentIntervalStart.getHours();
      let dayLabel = currentIntervalStart.toLocaleDateString("tr-TR", { day: 'numeric', month: 'short' });
      let displayHour = hr.toString().padStart(2, '0') + ":00";
      let labelText = `${dayLabel} ${displayHour}`;

      chartLabels.push(labelText);

      // Hafta Sonu kontrolü (Grid için fonksiyona gönderilecek)
      let dayOfWeek = currentIntervalStart.getDay();
      isWeekendData.push(dayOfWeek === 0 || dayOfWeek === 6);

      // İdeal Çizgi: Sadece Start anı için (activatedDate) offset ayarı.
      // Eğer sprint geç başlatıldıysa activatedDate anına kadar ideal çizgi düşmez.
      // Ayrıca hafta sonu geldiğinde geçen "çalışma" süresi durduğu için çizgi yatay (düz) seyreder.
      let elapsedWorking = getWorkingMs(sprintActiveTimeObj, currentIntervalStart);

      let idealValue = sprintActiveSP; // YALNIZCA KULLANICININ İSTEDİĞİ DEĞİŞİKLİK

      if (elapsedWorking > 0 && totalWorkingDuration > 0) {
        let idealPct = elapsedWorking / totalWorkingDuration;
        if (idealPct > 1) idealPct = 1;
        idealValue = sprintActiveSP - (sprintActiveSP * idealPct);
      }

      idealChartData.push(Math.max(0, idealValue));

      // Gerçek Çizgi (Actual Burndown)
      let intervalEvents = burndownAuditLog.filter(e => e.rawDate >= currentIntervalStart && e.rawDate <= currentIntervalEnd);
      let tooltipLines = [];

      intervalEvents.forEach(e => {
        if (!e.isPreSprint) {
          runningSP = e.totalSP;
          let spStr = e.spEffect ? `(${e.spEffect > 0 ? '+' : ''}${e.spEffect} SP)` : '';
          tooltipLines.push(`${e.key} ${spStr}`);
        }
      });

      // Eğer saat henüz yaşanmadıysa (gelecekse) ve sprint açıkse çizgiyi çizme (null bırak)
      if (currentIntervalStart > now && !isSprintClosed) {
        actualChartData.push(null);
        chartTooltips.push([`${dayLabel} ${displayHour}`]);
      } else {
        // Eğer sprintin en son saatine geldiysek ve sprint tamamen bittiyse "Kapandı" verip 0'a çek
        if (i === sprintIntervalsCount && isSprintClosed) {
          actualChartData.push(0);
          tooltipLines.push(`Sprint Kapandı`);
          tooltipLines.push(`Devreden: ${runningSP} SP`);

          // Sadece en son gün için, loglarda önceden kapandı eventi yoksa ekle
          if (!burndownAuditLog.some(l => l.type === 'Sprint Kapandı')) {
            let sEndObj = new Date(sprintEnd);
            burndownAuditLog.push({
              date: sEndObj.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
              key: '-',
              type: 'Sprint Kapandı',
              details: `Devreden Toplam: ${runningSP} SP`,
              spEffect: -runningSP,
              totalSP: 0,
              isPreSprint: false
            });
          }
          tooltipLines.unshift(`${dayLabel} ${displayHour}`);
          chartTooltips.push(tooltipLines);
        } else {
          // Normal saat kapanışı
          let isFirstInterval = (i === 0);
          let isCurrentInterval = (now >= currentIntervalStart && now <= currentIntervalEnd);
          let hasEvents = (tooltipLines.length > 0);

          // Eğer bu 4 saat içinde hiçbir işlem olmadıysa, kullanıcı "nokta koyma" dediği için null push edilir.
          // Fakat çizginin kopmaması (başlangıç ve şimdiki zaman iskeleti) için ilk an ve şu an noktaları korunur.
          if (!hasEvents && !isFirstInterval && !isCurrentInterval) {
            actualChartData.push(null);
            chartTooltips.push([`${dayLabel} ${displayHour}`]);
          } else {
            actualChartData.push(runningSP);
            if (!hasEvents) {
              chartTooltips.push([`${dayLabel} ${displayHour} Kalan: ${runningSP} SP`]);
            } else {
              tooltipLines.unshift(`${dayLabel} ${displayHour}`);
              chartTooltips.push(tooltipLines);
            }
          }
        }
      }
    }
    // --- END DEBUG LOGGING ---


    let chartData = {
      labels: chartLabels,
      ideal: idealChartData,
      actual: actualChartData,
      tooltips: chartTooltips, // Pass to frontend
      isWeekend: isWeekendData
    };

    let finalChartPayload = chartData;

    // Ratios
    committedSP = committedSP - removedSP
    const doneCommittedRatio = committedSP ? (doneSP / committedSP) * 100 : 0;
    const emergedCommittedRatio = committedSP ? (emergedSP / committedSP) * 100 : 0;
    const undoneDoneRatio = doneSP ? (undoneSP / doneSP) * 100 : 0;

    // Health Score Calculation (RAG)
    let score = Math.ceil(doneCommittedRatio);
    let healthStatus = { text: "Riskli", score: score, color: "#e53e3e" }; // Red
    if (doneCommittedRatio >= 90) {
      healthStatus = { text: "Mükemmel", score: score, color: "#38a169" }; // Green
    } else if (doneCommittedRatio >= 75) {
      healthStatus = { text: "İyi", score: score, color: "#3182ce" }; // Blue
    } else if (doneCommittedRatio >= 60) {
      healthStatus = { text: "Orta", score: score, color: "#dd6b20" }; // Orange
    }

    res.json({
      baseUrl: baseUrl, // Pass back for linking
      sprintNo: `Sprint ${sprint.id}`,
      sprintAdi: sprint.name,
      state: sprint.state,
      sprintGoal: sprint.goal || "Belirtilmemiş",
      developmentTeam: developmentTeamName,
      productOwner: "---",
      scrumMaster: scrumMasterName || "---",
      committed: committedSP,
      emerged: emergedSP,
      undone: undoneSP,
      velocity: doneSP,
      removed: removedSP,
      breakdown: {
        gelistirme: gelistirmeSP,
        bakim: bakimSP,
        diger: digerSP
      },
      // New Metric Counts
      totalTasks: issues.length,
      issueTypeCounts: issueTypeCounts,

      // Assignee Data
      assigneeBreakdown: {
        labels: Object.keys(sortedAssignees),
        data: Object.values(sortedAssignees)
      },
      assigneeMatrix: assigneeDetailed,
      matrixColumns: sortedIssueTypes,

      // New Stats
      healthStatus: healthStatus,
      scopeCreepRate: scopeCreepRate.toFixed(1) + "%",

      doneCommittedRatio: doneCommittedRatio.toFixed(0) + "%",
      emergedCommittedRatio: emergedCommittedRatio.toFixed(0) + "%",
      emergedDoneRatio: doneSP ? ((emergedSP / doneSP) * 100).toFixed(0) + "%" : "0%",
      undoneDoneRatio: undoneDoneRatio.toFixed(0) + "%",
      innovationRate: innovationRate.toFixed(0) + "%",
      sprintBaslangic: new Date(sprintStart).toLocaleDateString("tr-TR"),
      sprintBitis: new Date(sprintEnd).toLocaleDateString("tr-TR"),
      sprintReview: new Date(sprintEnd).toLocaleDateString("tr-TR"),
      sprintActivatedDate: sprint.activatedDate ? new Date(sprint.activatedDate).toLocaleString("tr-TR") : "Bilinmiyor",
      chartData: finalChartPayload,
      issueList: issueList, // Yeni liste
      workloadReport: workloadReport,
      burndownAuditLog: burndownAuditLog
    });
  } catch (error) {
    console.error(error);
    if (error.response) {
      console.error("Jira API Error Data:", JSON.stringify(error.response.data, null, 2));
      console.error("Jira API Status:", error.response.status);
    }
    res.status(500).json({ error: error.message, details: error.response ? error.response.data : null });
  }
});

app.listen(3000, () => {
  console.log("Proxy server running on http://localhost:3000");
});
