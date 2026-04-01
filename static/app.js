(function () {
  var skillPlaybooks = {
    "10-Yard Sprint": "Practice short explosive starts with a ready stance, one clap start, and 3 to 5 quick bursts.",
    "20-Yard Sprint": "Use build-up sprints and posture drills to improve speed maintenance over a longer distance.",
    "30-Yard Sprint": "Work on arm drive, staying tall through the middle of the run, and finishing through the line.",
    "Vertical Jump": "Add squat jumps, line hops, and soft landing drills to build lower-body power and balance.",
    "Throw Accuracy": "Use wall targets, partner tosses, and step-throw-follow drills to improve accuracy.",
    "L-Drill Agility": "Practice planting off the outside foot, low hips through the turns, and quick cone cuts.",
    "5-10-5 Shuttle": "Focus on strong change-of-direction mechanics, touch-and-go turns, and lateral push-off speed."
  };

  var unitPresets = {
    seconds: { label: "Seconds", suffix: " sec", decimals: 4, defaultDirection: "lower" },
    milliseconds: { label: "Milliseconds", suffix: " ms", decimals: 4, defaultDirection: "lower" },
    minutes: { label: "Minutes", suffix: " min", decimals: 4, defaultDirection: "lower" },
    inches: { label: "Inches", suffix: " in", decimals: 4, defaultDirection: "higher" },
    feet: { label: "Feet", suffix: " ft", decimals: 4, defaultDirection: "higher" },
    yards: { label: "Yards", suffix: " yd", decimals: 4, defaultDirection: "higher" },
    meters: { label: "Meters", suffix: " m", decimals: 4, defaultDirection: "higher" },
    repetitions: { label: "Repetitions", suffix: " reps", decimals: 4, defaultDirection: "higher" },
    count: { label: "Count", suffix: "", decimals: 4, defaultDirection: "higher" },
    score: { label: "Score", suffix: "", decimals: 4, defaultDirection: "higher" },
    percentage: { label: "Percentage", suffix: "%", decimals: 4, defaultDirection: "higher" },
    points: { label: "Points", suffix: " pts", decimals: 4, defaultDirection: "higher" },
    laps: { label: "Laps", suffix: " laps", decimals: 4, defaultDirection: "higher" },
    bpm: { label: "Beats Per Minute", suffix: " bpm", decimals: 4, defaultDirection: "lower" },
    pounds: { label: "Pounds", suffix: " lb", decimals: 4, defaultDirection: "higher" },
    kilograms: { label: "Kilograms", suffix: " kg", decimals: 4, defaultDirection: "higher" }
  };

  var expectedCoachSubmissions = 20;
  var freshSubmissionWindowMinutes = 15;

  var state = {
    authMode: "admin",
    authAction: "login",
    authStage: "landing",
    currentView: "overview",
    selectedAdminSchoolId: "",
    editingSkillId: null,
    pendingVerificationEmail: "",
    pendingVerificationSource: "",
    ocrCameraStream: null,
    capturedOcrBlob: null,
    capturedOcrFilename: "",
    capturedOcrUrl: "",
    emailSettings: emptyEmailSettings(),
    user: null,
    data: emptyData(),
    needsSetup: false,
    installPrompt: null,
    lastSavedCoachPerformance: null,
    refreshInFlight: false
  };

  var statusTimer = null;
  var els = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    bindElements();
    bindEvents();
    registerAppFeatures();
    registerLiveRefresh();
    setDefaultDates();
    hydrateDashboardStateFromUrl();
    switchAuthMode("admin");
    loadInitialState();
  }

  function bindElements() {
    els.authShell = document.getElementById("auth-shell");
    els.appShell = document.getElementById("app-shell");
    els.authTitle = document.getElementById("auth-title");
    els.authDescription = document.getElementById("auth-description");
    els.authEntryStage = document.getElementById("auth-entry-stage");
    els.entryAdminBtn = document.getElementById("entry-admin-btn");
    els.entryCoachBtn = document.getElementById("entry-coach-btn");
    els.authRoleSwitch = document.getElementById("auth-role-switch");
    els.authRoleButtons = document.querySelectorAll(".auth-role-btn");
    els.authHomeBtn = document.getElementById("auth-home-btn");
    els.authActionSwitch = document.getElementById("auth-action-switch");
    els.authActionButtons = document.querySelectorAll(".auth-action-btn");
    els.authHelper = document.getElementById("auth-helper");
    els.setupForm = document.getElementById("setup-form");
    els.setupUsername = document.getElementById("setup-username");
    els.setupName = document.getElementById("setup-name");
    els.setupEmail = document.getElementById("setup-email");
    els.setupPassword = document.getElementById("setup-password");
    els.setupError = document.getElementById("setup-error");
    els.loginForm = document.getElementById("login-form");
    els.loginIdentifier = document.getElementById("login-identifier");
    els.loginPassword = document.getElementById("login-password");
    els.loginSubmitBtn = document.getElementById("login-submit-btn");
    els.loginError = document.getElementById("login-error");
    els.registerForm = document.getElementById("register-form");
    els.registerRoleWrap = document.getElementById("register-role-wrap");
    els.registerRole = document.getElementById("register-role");
    els.registerName = document.getElementById("register-name");
    els.registerUsername = document.getElementById("register-username");
    els.registerEmail = document.getElementById("register-email");
    els.registerPassword = document.getElementById("register-password");
    els.registerFamilyFields = document.getElementById("register-family-fields");
    els.registerSchool = document.getElementById("register-school");
    els.registerGrade = document.getElementById("register-grade");
    els.registerSubmitBtn = document.getElementById("register-submit-btn");
    els.registerError = document.getElementById("register-error");
    els.verifyForm = document.getElementById("verify-form");
    els.verifyEmail = document.getElementById("verify-email");
    els.verifyCode = document.getElementById("verify-code");
    els.verifySubmitBtn = document.getElementById("verify-submit-btn");
    els.resendVerificationBtn = document.getElementById("resend-verification-btn");
    els.verifyBackBtn = document.getElementById("verify-back-btn");
    els.verifyDelivery = document.getElementById("verify-delivery");
    els.verifyError = document.getElementById("verify-error");
    els.emailSettingsDetails = document.getElementById("email-settings-details");
    els.emailSettingsHelper = document.getElementById("email-settings-helper");
    els.emailSettingsForm = document.getElementById("email-settings-form");
    els.smtpHost = document.getElementById("smtp-host");
    els.smtpPort = document.getElementById("smtp-port");
    els.smtpSecurity = document.getElementById("smtp-security");
    els.smtpFromEmail = document.getElementById("smtp-from-email");
    els.smtpUsername = document.getElementById("smtp-username");
    els.smtpPassword = document.getElementById("smtp-password");
    els.smtpTestRecipient = document.getElementById("smtp-test-recipient");
    els.smtpGmailBtn = document.getElementById("smtp-gmail-btn");
    els.smtpSaveBtn = document.getElementById("smtp-save-btn");
    els.smtpTestBtn = document.getElementById("smtp-test-btn");
    els.emailSettingsStatus = document.getElementById("email-settings-status");
    els.emailSettingsError = document.getElementById("email-settings-error");
    els.sidebarRolePill = document.getElementById("sidebar-role-pill");
    els.activeUserSummary = document.getElementById("active-user-summary");
    els.navButtons = document.querySelectorAll(".nav-btn");
    els.viewPanels = document.querySelectorAll(".view");
    els.logoutBtn = document.getElementById("logout-btn");
    els.topbarEyebrow = document.getElementById("topbar-eyebrow");
    els.topbarTitle = document.getElementById("topbar-title");
    els.topbarSubtitle = document.getElementById("topbar-subtitle");
    els.switchAccountBtn = document.getElementById("switch-account-btn");
    els.refreshDataBtn = document.getElementById("refresh-data-btn");
    els.exportAppBtn = document.getElementById("export-app-btn");
    els.printReportBtn = document.getElementById("print-report-btn");
    els.installAppBtn = document.getElementById("install-app-btn");
    els.statusBanner = document.getElementById("status-banner");
    els.alertBanners = document.getElementById("alert-banners");
    els.metricTemplate = document.getElementById("metric-card-template");
    els.adminOnlyPanels = document.querySelectorAll(".admin-only");
    els.coachOnlyPanels = document.querySelectorAll(".coach-only");
    els.statsGrid = document.getElementById("stats-grid");
    els.quickActions = document.getElementById("quick-actions");
    els.insightsList = document.getElementById("insights-list");
    els.adminHandoffFeed = document.getElementById("admin-handoff-feed");
    els.benchmarkFeed = document.getElementById("benchmark-feed");
    els.adminSchoolFilter = document.getElementById("admin-school-filter");
    els.engagementSummary = document.getElementById("engagement-summary");
    els.coachScoreOverview = document.getElementById("coach-score-overview");
    els.coachScoreImpact = document.getElementById("coach-score-impact");
    els.performanceExplainer = document.getElementById("performance-explainer");
    els.performanceTable = document.getElementById("performance-table");
    els.reportSchoolSelect = document.getElementById("report-school-select");
    els.reportGradeSelect = document.getElementById("report-grade-select");
    els.reportSummary = document.getElementById("report-summary");
    els.schoolSkillChart = document.getElementById("school-skill-chart");
    els.eodCoachFilter = document.getElementById("eod-coach-filter");
    els.eodWindowFilter = document.getElementById("eod-window-filter");
    els.eodReportSummary = document.getElementById("eod-report-summary");
    els.adminEodReportsList = document.getElementById("admin-eod-reports-list");
    els.incidentReviewSummary = document.getElementById("incident-review-summary");
    els.schoolForm = document.getElementById("school-form");
    els.schoolsList = document.getElementById("schools-list");
    els.gradeForm = document.getElementById("grade-form");
    els.gradesList = document.getElementById("grades-list");
    els.skillForm = document.getElementById("skill-form");
    els.skillEditId = document.getElementById("skill-edit-id");
    els.skillName = document.getElementById("skill-name");
    els.skillAbbreviation = document.getElementById("skill-abbreviation");
    els.skillUnit = document.getElementById("skill-unit");
    els.skillUnitCustomWrap = document.getElementById("skill-unit-custom-wrap");
    els.skillUnitCustom = document.getElementById("skill-unit-custom");
    els.skillDirection = document.getElementById("skill-direction");
    els.skillSubmitBtn = document.getElementById("skill-submit-btn");
    els.skillCancelBtn = document.getElementById("skill-cancel-btn");
    els.skillsList = document.getElementById("skills-list");
    els.userForm = document.getElementById("user-form");
    els.userRole = document.getElementById("user-role");
    els.userSchoolWrap = document.getElementById("user-school-wrap");
    els.userSchool = document.getElementById("user-school");
    els.userGradeWrap = document.getElementById("user-grade-wrap");
    els.userGrade = document.getElementById("user-grade");
    els.userUsername = document.getElementById("user-username");
    els.usersList = document.getElementById("users-list");
    els.sessionForm = document.getElementById("session-form");
    els.sessionSchool = document.getElementById("session-school");
    els.sessionGrade = document.getElementById("session-grade");
    els.sessionDate = document.getElementById("session-date");
    els.sessionCoach = document.getElementById("session-coach");
    els.sessionEngagement = document.getElementById("session-engagement");
    els.eodReportForm = document.getElementById("eod-report-form");
    els.eodSchool = document.getElementById("eod-school");
    els.eodDate = document.getElementById("eod-date");
    els.eodClasses = document.getElementById("eod-classes");
    els.eodSummary = document.getElementById("eod-summary");
    els.eodCelebrations = document.getElementById("eod-celebrations");
    els.eodFollowUp = document.getElementById("eod-follow-up");
    els.eodSupport = document.getElementById("eod-support");
    els.eodScoreImpact = document.getElementById("eod-score-impact");
    els.coachEodReportsList = document.getElementById("coach-eod-reports-list");
    els.skillInputs = document.getElementById("skill-inputs");
    els.ocrForm = document.getElementById("ocr-form");
    els.ocrSchool = document.getElementById("ocr-school");
    els.ocrGrade = document.getElementById("ocr-grade");
    els.ocrDate = document.getElementById("ocr-date");
    els.ocrNote = document.getElementById("ocr-note");
    els.ocrImage = document.getElementById("ocr-image");
    els.ocrOpenCameraBtn = document.getElementById("ocr-open-camera-btn");
    els.ocrCaptureBtn = document.getElementById("ocr-capture-btn");
    els.ocrStopCameraBtn = document.getElementById("ocr-stop-camera-btn");
    els.ocrCameraPanel = document.getElementById("ocr-camera-panel");
    els.ocrCameraVideo = document.getElementById("ocr-camera-video");
    els.ocrCameraCanvas = document.getElementById("ocr-camera-canvas");
    els.ocrCapturedPreview = document.getElementById("ocr-captured-preview");
    els.ocrSourceHint = document.getElementById("ocr-source-hint");
    els.ocrPreview = document.getElementById("ocr-preview");
    els.ocrError = document.getElementById("ocr-error");
    els.commentForm = document.getElementById("comment-form");
    els.commentSchool = document.getElementById("comment-school");
    els.commentGrade = document.getElementById("comment-grade");
    els.commentDate = document.getElementById("comment-date");
    els.commentsList = document.getElementById("comments-list");
    els.sessionsList = document.getElementById("sessions-list");
    els.incidentForm = document.getElementById("incident-form");
    els.incidentSchool = document.getElementById("incident-school");
    els.incidentDate = document.getElementById("incident-date");
    els.incidentTitle = document.getElementById("incident-title");
    els.incidentDetails = document.getElementById("incident-details");
    els.incidentsList = document.getElementById("incidents-list");
    els.parentSchoolSelect = document.getElementById("parent-school-select");
    els.parentGradeSelect = document.getElementById("parent-grade-select");
    els.parentGradeSummary = document.getElementById("parent-grade-summary");
    els.districtComparison = document.getElementById("district-comparison");
    els.parentSkillChart = document.getElementById("parent-skill-chart");
    els.progressGraphGrid = document.getElementById("progress-graph-grid");
    els.homePlaybook = document.getElementById("home-playbook");
    els.trendList = document.getElementById("trend-list");
    els.parentComments = document.getElementById("parent-comments");
    els.registerStaffSchoolWrap = document.getElementById("register-staff-school-wrap");
    els.registerStaffSchool = document.getElementById("register-staff-school");
  }

  function bindEvents() {
    eachNode(els.authRoleButtons, function (button) {
      button.addEventListener("click", function () {
        switchAuthMode(button.getAttribute("data-auth-mode"));
      });
    });

    els.entryAdminBtn.addEventListener("click", function () {
      openPortalEntry("admin");
    });
    if (els.entryCoachBtn) {
      els.entryCoachBtn.addEventListener("click", function () {
        openPortalEntry("coach");
      });
    }
    els.authHomeBtn.addEventListener("click", handleAuthHome);

    eachNode(els.authActionButtons, function (button) {
      button.addEventListener("click", function () {
        switchAuthAction(button.getAttribute("data-auth-action"));
      });
    });

    eachNode(els.navButtons, function (button) {
      button.addEventListener("click", function () {
        var view = button.getAttribute("data-view");
        if (!isViewAllowed(view, state.user ? state.user.role : "")) {
          return;
        }
        state.currentView = view;
        renderAppShell();
      });
    });

    document.addEventListener("click", handleActionClick);
    els.setupForm.addEventListener("submit", handleSetupSubmit);
    els.loginForm.addEventListener("submit", handleLoginSubmit);
    els.registerForm.addEventListener("submit", handleRegisterSubmit);
    els.verifyForm.addEventListener("submit", handleVerifySubmit);
    els.resendVerificationBtn.addEventListener("click", handleResendVerification);
    els.verifyBackBtn.addEventListener("click", handleVerifyBack);
    els.logoutBtn.addEventListener("click", handleLogout);
    if (els.switchAccountBtn) {
      els.switchAccountBtn.addEventListener("click", handleSwitchAccount);
    }
    if (els.refreshDataBtn) {
      els.refreshDataBtn.addEventListener("click", handleRefreshData);
    }
    els.exportAppBtn.addEventListener("click", handleExportDownload);
    els.printReportBtn.addEventListener("click", function () {
      window.print();
    });
    els.installAppBtn.addEventListener("click", handleInstallClick);
    els.schoolForm.addEventListener("submit", handleSchoolSubmit);
    els.gradeForm.addEventListener("submit", handleGradeSubmit);
    els.skillForm.addEventListener("submit", handleSkillSubmit);
    els.skillCancelBtn.addEventListener("click", resetSkillForm);
    els.userForm.addEventListener("submit", handleUserSubmit);
    els.sessionForm.addEventListener("submit", handleSessionSubmit);
    els.sessionForm.addEventListener("input", renderCoachScoreImpact);
    els.sessionForm.addEventListener("change", renderCoachScoreImpact);
    els.sessionForm.addEventListener("invalid", handleFormInvalid, true);
    if (els.eodReportForm) {
      els.eodReportForm.addEventListener("submit", handleEodReportSubmit);
      els.eodReportForm.addEventListener("input", renderEodScoreImpact);
      els.eodReportForm.addEventListener("change", renderEodScoreImpact);
      els.eodReportForm.addEventListener("invalid", handleFormInvalid, true);
    }
    els.ocrForm.addEventListener("submit", handleOcrSubmit);
    els.ocrImage.addEventListener("change", handleOcrFileChange);
    els.ocrOpenCameraBtn.addEventListener("click", handleOpenOcrCamera);
    els.ocrCaptureBtn.addEventListener("click", handleCaptureOcrPhoto);
    els.ocrStopCameraBtn.addEventListener("click", handleStopOcrCamera);
    if (els.commentForm) {
      els.commentForm.addEventListener("submit", handleCommentSubmit);
      els.commentForm.addEventListener("invalid", handleFormInvalid, true);
    }
    if (els.incidentForm) {
      els.incidentForm.addEventListener("submit", handleIncidentSubmit);
      els.incidentForm.addEventListener("invalid", handleFormInvalid, true);
    }
    els.userRole.addEventListener("change", toggleUserAccessFields);
    if (els.registerRole) {
      els.registerRole.addEventListener("change", updateRegisterRoleFields);
    }
    els.skillUnit.addEventListener("change", updateSkillUnitField);
    els.reportSchoolSelect.addEventListener("change", renderReportSection);
    els.reportGradeSelect.addEventListener("change", renderReportSection);
    if (els.eodCoachFilter) {
      els.eodCoachFilter.addEventListener("change", renderAdminEodReports);
    }
    if (els.eodWindowFilter) {
      els.eodWindowFilter.addEventListener("change", renderAdminEodReports);
    }
    if (els.parentSchoolSelect) {
      els.parentSchoolSelect.addEventListener("change", renderParentPortal);
    }
    if (els.parentGradeSelect) {
      els.parentGradeSelect.addEventListener("change", renderParentPortal);
    }
    if (els.adminSchoolFilter) {
      els.adminSchoolFilter.addEventListener("change", handleAdminSchoolFilterChange);
    }
  }

  function registerAppFeatures() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/service-worker.js")
        .then(function (registration) {
          registration.update();
          return null;
        })
        .catch(function () {
          return null;
        });
    }

    window.addEventListener("beforeinstallprompt", function (event) {
      event.preventDefault();
      state.installPrompt = event;
      updateInstallButton();
    });

    window.addEventListener("appinstalled", function () {
      state.installPrompt = null;
      updateInstallButton();
      showStatus("Ufit Motion was installed on this device.", "success");
    });
  }

  function registerLiveRefresh() {
    window.setInterval(function () {
      if (!state.user || document.hidden) {
        return;
      }
      refreshDashboardData(true);
    }, 15000);

    window.addEventListener("focus", function () {
      if (!state.user) {
        return;
      }
      refreshDashboardData(true);
    });
  }

  function handleInstallClick() {
    if (!state.installPrompt) {
      showStatus("Install will appear once the browser offers it for this app.", "info");
      return;
    }

    state.installPrompt.prompt();
    state.installPrompt.userChoice.then(function () {
      state.installPrompt = null;
      updateInstallButton();
    });
  }

  function handleRefreshData() {
    refreshDashboardData(false);
  }

  function updateInstallButton() {
    if (!els.installAppBtn) {
      return;
    }
    els.installAppBtn.classList.toggle("hidden", !state.installPrompt);
  }

  function loadInitialState() {
    apiRequest("GET", "/api/session")
      .then(function (payload) {
        state.needsSetup = !!payload.needsSetup;
        if (payload.authenticated) {
          if (shouldForceWelcomeScreen()) {
            return apiRequest("POST", "/api/logout")
              .catch(function () {
                return null;
              })
              .then(function () {
                state.user = null;
                state.authStage = "landing";
                state.data = emptyData();
                clearWelcomeSearchParam();
                return loadPublicOptions().then(function () {
                  renderAll();
                });
              });
          }

          state.user = payload.user;
          state.authMode = payload.user.role === "coach" ? "coach" : "admin";
          state.currentView = defaultViewForRole(payload.user.role);
          return loadBootstrap();
        }

        state.user = null;
        state.authStage = "landing";
        state.data = emptyData();
        clearWelcomeSearchParam();
        if (state.needsSetup) {
          renderAll();
          return null;
        }
        return loadPublicOptions().then(function () {
          renderAll();
        });
      })
      .catch(function (error) {
        showStatus(error.message || "Unable to load the app.", "error");
      });
  }

  function loadPublicOptions() {
    return apiRequest("GET", "/api/public-options")
      .then(function (payload) {
        state.data.schools = payload.schools || [];
        state.data.grades = payload.grades || [];
      })
      .catch(function () {
        state.data.schools = [];
        state.data.grades = [];
      });
  }

  function loadEmailSettings() {
    return apiRequest("GET", "/api/email-settings")
      .then(function (payload) {
        state.emailSettings = mergeEmailSettings(payload.settings || {});
      })
      .catch(function () {
        state.emailSettings = emptyEmailSettings();
      });
  }

  function loadBootstrap() {
    var currentAdminSchoolId = state.selectedAdminSchoolId;
    return apiRequest("GET", "/api/bootstrap")
      .then(function (payload) {
        state.user = payload.user;
        state.authMode = payload.user && payload.user.role === "coach" ? "coach" : "admin";
        state.needsSetup = false;
        state.data = {
          schools: payload.schools || [],
          grades: payload.grades || [],
          skills: payload.skills || [],
          sessions: payload.sessions || [],
          eodReports: payload.eodReports || [],
          comments: payload.comments || [],
          users: payload.users || [],
          incidents: payload.incidents || [],
          alerts: payload.alerts || [],
          performanceRows: payload.performanceRows || [],
          coachPerformance: payload.coachPerformance || null,
          engagementSummary: payload.engagementSummary || null,
          selectedSchoolId: payload.selectedSchoolId || currentAdminSchoolId || ""
        };
        state.selectedAdminSchoolId = payload.selectedSchoolId ? String(payload.selectedSchoolId) : (currentAdminSchoolId || "");
        renderAll();
      })
      .catch(function (error) {
        if (error.status === 401) {
          return apiRequest("GET", "/api/session")
            .then(function (payload) {
              state.user = null;
              state.needsSetup = !!payload.needsSetup;
              state.data = emptyData();
              if (state.needsSetup) {
                renderAll();
                return;
              }
              return loadPublicOptions().then(function () {
                renderAll();
              });
            })
            .catch(function () {
              state.user = null;
              state.needsSetup = false;
              state.data = emptyData();
              renderAll();
            });
        }
        showStatus(error.message || "Unable to load app data.", "error");
      });
  }

  function refreshDashboardData(silent) {
    if (!state.user || state.refreshInFlight) {
      return Promise.resolve();
    }

    state.refreshInFlight = true;
    return apiRequest("GET", "/api/bootstrap")
      .then(function (payload) {
        var currentAdminSchoolId = state.selectedAdminSchoolId;
        state.user = payload.user;
        state.data = {
          schools: payload.schools || [],
          grades: payload.grades || [],
          skills: payload.skills || [],
          sessions: payload.sessions || [],
          eodReports: payload.eodReports || [],
          comments: payload.comments || [],
          users: payload.users || [],
          incidents: payload.incidents || [],
          alerts: payload.alerts || [],
          performanceRows: payload.performanceRows || [],
          coachPerformance: payload.coachPerformance || null,
          engagementSummary: payload.engagementSummary || null,
          selectedSchoolId: payload.selectedSchoolId || currentAdminSchoolId || ""
        };
        state.selectedAdminSchoolId = payload.selectedSchoolId ? String(payload.selectedSchoolId) : (currentAdminSchoolId || "");
        renderAll();
        if (!silent) {
          showStatus("Data refreshed.", "success");
        }
      })
      .catch(function (error) {
        if (!silent) {
          showStatus(error.message || "Unable to refresh data.", "error");
        }
      })
      .finally(function () {
        state.refreshInFlight = false;
      });
  }

  function apiRequest(method, url, payload) {
    var options = {
      method: method,
      credentials: "same-origin",
      headers: {}
    };

    if (payload) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(payload);
    }

    return fetch(url, options).then(function (response) {
      return response.text().then(function (text) {
        var data = {};
        if (text) {
          try {
            data = JSON.parse(text);
          } catch (error) {
            data = {};
          }
        }

        if (!response.ok) {
          var err = new Error(data.error || "Request failed.");
          err.status = response.status;
          err.payload = data;
          throw err;
        }

        return data;
      });
    });
  }

  function renderAll() {
    sortCollections();
    populateSelects();
    toggleUserAccessFields();
    updateRegisterRoleFields();
    updateSkillUnitField();
    renderAuthShell();
    renderAppShell();
    renderSkillInputs();
    renderStats();
    renderQuickActions();
    renderInsights();
    renderAdminHandoffFeed();
    renderAlertBanners();
    renderEngagementSummary();
    renderIncidentReviewSummary();
    renderCoachScoreOverview();
    renderCoachScoreImpact();
    renderEodScoreImpact();
    renderPerformanceExplainer();
    renderAdminEodReports();
    renderCoachEodReports();
    renderSchoolsList();
    renderGradesList();
    renderSkillsList();
    renderUsersList();
    renderPerformanceTable();
    renderSessionsList();
    renderCommentsList();
    renderIncidentsList();
    renderReportSection();
    renderParentPortal();
    renderOcrCaptureUi();
    updateInstallButton();
  }

  function renderAuthShell() {
    eachNode(els.authRoleButtons, function (button) {
      button.classList.toggle("active", button.getAttribute("data-auth-mode") === state.authMode);
    });
    eachNode(els.authActionButtons, function (button) {
      button.classList.toggle("active", button.getAttribute("data-auth-action") === state.authAction);
    });

    var isCoachPortal = state.authMode === "coach";
    var portalLabel = isCoachPortal ? "coach" : "admin";
    var showLanding = !state.user && !state.needsSetup && state.authStage === "landing";

    if (state.needsSetup) {
      els.authTitle.textContent = "Create your first admin account";
      els.authDescription.textContent = "This is a one-time setup. After this admin account is created, you can sign in, add schools, create coach accounts, and manage the full platform.";
      els.authHelper.textContent = "Use a simple staff username so admins and coaches can sign in quickly.";
    } else if (showLanding) {
      els.authTitle.textContent = "Choose your portal";
      els.authDescription.textContent = "Pick the side of Ufit Motion you want to enter. Admin and coach logins now start from separate portals.";
      els.authHelper.textContent = "Each portal only accepts the matching account type so the experience stays simple and role-specific.";
    } else if (state.authAction === "register") {
      els.authTitle.textContent = isCoachPortal ? "Create a coach account" : "Create an admin account";
      els.authDescription.textContent = isCoachPortal
        ? "Create a coach login for score capture, class submissions, and incident reporting."
        : "Create an admin login for reporting, school setup, coach oversight, and alerts.";
      els.authHelper.textContent = isCoachPortal
        ? "Coach accounts are tied to a school so submissions stay scoped correctly."
        : "Admin accounts open the full program dashboard and configuration tools.";
    } else if (state.authAction === "verify") {
      els.authTitle.textContent = state.pendingVerificationSource === "register"
        ? "Finish creating your account"
        : "Verify your email";
      els.authDescription.textContent = state.pendingVerificationSource === "register"
        ? "Enter the verification code we just sent so the new account can be activated right away."
        : "This account still needs a verification code before it can sign in for the first time.";
      els.authHelper.textContent = "Enter the latest verification code to finish the secure " + portalLabel + " sign-in flow.";
    } else if (isCoachPortal) {
      els.authTitle.textContent = "Sign into the coach portal";
      els.authDescription.textContent = "Coach logins open score capture, PE session entry, coaching activity, and incident reporting.";
      els.authHelper.textContent = "Use a coach username or email for this portal.";
    } else {
      els.authTitle.textContent = "Sign into the admin portal";
      els.authDescription.textContent = "Admin logins open reporting, school setup, coach performance views, and incident alerts.";
      els.authHelper.textContent = "Use an admin username or email for this portal.";
    }

    els.authEntryStage.classList.toggle("hidden", !showLanding);
    els.authRoleSwitch.classList.add("hidden");
    els.authHomeBtn.classList.toggle("hidden", state.needsSetup || showLanding);
    els.authActionSwitch.classList.toggle("hidden", state.needsSetup || showLanding || state.authAction === "verify");
    els.setupForm.classList.toggle("hidden", !state.needsSetup);
    els.loginForm.classList.toggle("hidden", state.needsSetup || showLanding || state.authAction !== "login");
    els.registerForm.classList.toggle("hidden", state.needsSetup || showLanding || state.authAction !== "register");
    els.verifyForm.classList.toggle("hidden", state.needsSetup || showLanding || state.authAction !== "verify");
    els.registerRoleWrap.classList.add("hidden");
    els.registerFamilyFields.classList.add("hidden");
    if (els.registerRole) {
      els.registerRole.value = isCoachPortal ? "coach" : "admin";
    }
    els.registerSubmitBtn.textContent = isCoachPortal ? "Create Coach Account" : "Create Admin Account";
    els.loginSubmitBtn.textContent = isCoachPortal ? "Enter Coach Portal" : "Enter Admin Portal";
    updateRegisterRoleFields();
    if (state.authAction === "verify" && state.pendingVerificationEmail) {
      els.verifyEmail.value = state.pendingVerificationEmail;
    }
    els.verifySubmitBtn.textContent = state.pendingVerificationSource === "register" ? "Finish Account Setup" : "Verify and Enter App";
    els.verifyBackBtn.textContent = state.pendingVerificationSource === "register" ? "Back to Sign Up" : "Back to Sign In";

    if (state.user) {
      els.authShell.classList.add("hidden");
      els.appShell.classList.remove("hidden");
    } else {
      els.authShell.classList.remove("hidden");
      els.appShell.classList.add("hidden");
    }
  }

  function renderAppShell() {
    if (!state.user) {
      return;
    }

    state.currentView = isViewAllowed(state.currentView, state.user.role) ? state.currentView : defaultViewForRole(state.user.role);
    state.authMode = state.user.role === "coach" ? "coach" : "admin";
    els.exportAppBtn.classList.toggle("hidden", state.user.role !== "admin");

    els.sidebarRolePill.textContent = formatRole(state.user.role);
    els.activeUserSummary.innerHTML = [
      "<p><strong>" + escapeHtml(state.user.name) + "</strong></p>",
      "<p>@" + escapeHtml(state.user.username || "staff") + "</p>",
      "<p>" + escapeHtml(state.user.email) + "</p>",
      "<p>" + escapeHtml(describeUserAccess(state.user)) + "</p>"
    ].join("");

    eachNode(els.navButtons, function (button) {
      var view = button.getAttribute("data-view");
      var allowed = isViewAllowed(view, state.user.role);
      button.classList.toggle("hidden", !allowed);
      button.classList.toggle("active", view === state.currentView);
    });

    eachNode(els.adminOnlyPanels, function (panel) {
      panel.classList.toggle("hidden", state.user.role !== "admin");
    });
    eachNode(els.coachOnlyPanels, function (panel) {
      panel.classList.toggle("hidden", state.user.role !== "coach");
    });

    eachNode(els.viewPanels, function (panel) {
      panel.classList.toggle("active", panel.getAttribute("data-view-name") === state.currentView);
    });

    applyTopbarCopy();
    syncDashboardUrl();
  }

  function applyTopbarCopy() {
    var roleLabel = state.user && state.user.role === "coach" ? "Coach workspace" : "Admin workspace";
    var copy = getViewCopy(state.currentView, state.user ? state.user.role : "");

    els.topbarEyebrow.textContent = roleLabel;
    els.topbarTitle.textContent = copy.title;
    els.topbarSubtitle.textContent = copy.subtitle;
  }

  function getViewCopy(view, role) {
    var map = {
      overview: {
        title: role === "coach" ? "Coaching Overview" : "Program Overview",
        subtitle: role === "coach"
          ? "Review your PE activity, jump into score capture, and keep incident reporting quick."
          : "See the live snapshot first, then move into reports, setup, or incident review."
      },
      reports: {
        title: "School and District Reports",
        subtitle: "Filter by school, review engagement, compare district trends, and score coach performance."
      },
      setup: {
        title: "Platform Setup",
        subtitle: "Manage schools, districts, grades, skills, and staff access from one admin section."
      },
      capture: {
        title: "Capture PE Data",
        subtitle: "Import a score sheet photo, review OCR matches, and save clean class data without leaving the app."
      },
      activity: {
        title: "Program Activity",
        subtitle: "Submit end-of-day reports, review saved sessions, and keep a clean running feed of coach observations."
      },
      incidents: {
        title: "Incident Center",
        subtitle: "Log incidents quickly, review alerts, and keep admin follow-up visible."
      }
    };

    return map[view] || map.overview;
  }

  function renderSkillInputs() {
    if (!state.data.skills.length) {
      els.skillInputs.innerHTML = '<div class="empty-state">Add at least one skill so coaches can record class results.</div>';
      return;
    }

    var savedValues = {};
    els.skillInputs.querySelectorAll("input[name]").forEach(function (input) {
      if (input.value) {
        savedValues[input.name] = input.value;
      }
    });

    els.skillInputs.innerHTML = state.data.skills.map(function (skill) {
      return [
        "<label>",
        escapeHtml(skill.name) + " average",
        '<input type="text" inputmode="decimal" autocomplete="off" name="score-' + escapeHtml(String(skill.id)) + '" placeholder="' + escapeHtml(formatUnit(skill.unit)) + '">',
        '<p class="form-hint">Enter the grade-wide average in ' + escapeHtml(formatUnit(skill.unit).toLowerCase()) + ". Use up to 4 whole digits and up to 4 decimals.</p>",
        "</label>"
      ].join("");
    }).join("");

    Object.keys(savedValues).forEach(function (name) {
      var input = els.skillInputs.querySelector('input[name="' + name + '"]');
      if (input) {
        input.value = savedValues[name];
      }
    });
  }

  function handleFormInvalid(event) {
    if (!event || !event.target) {
      return;
    }

    var field = event.target;
    var label = getFieldLabelText(field);
    var labelLower = label.toLowerCase();
    var message = "Please check " + labelLower + " and try again.";

    if (field.validity) {
      if (field.validity.valueMissing) {
        message = "Please fill in " + labelLower + ".";
      } else if (field.validity.badInput) {
        message = "Please enter a valid number for " + labelLower + ".";
      } else if (field.validity.typeMismatch) {
        message = "Please enter a valid value for " + labelLower + ".";
      } else if (field.validity.rangeUnderflow || field.validity.rangeOverflow || field.validity.stepMismatch) {
        message = "Please enter a valid number for " + labelLower + ".";
      }
    }

    showStatus(message, "error");
  }

  function getFieldLabelText(field) {
    if (!field) {
      return "this field";
    }

    var label = field.closest("label");
    if (label) {
      var text = Array.prototype.map.call(label.childNodes, function (node) {
        return node && node.nodeType === 3 ? node.textContent : "";
      }).join(" ").replace(/\s+/g, " ").trim();
      if (text) {
        return text;
      }
    }

    return field.getAttribute("placeholder") || field.name || "this field";
  }

  function normalizeDecimalInput(value) {
    return String(value || "").trim().replace(/,/g, ".");
  }

  function parseSkillScoreInput(value) {
    var normalized = normalizeDecimalInput(value);
    if (!normalized) {
      return null;
    }
    if (!/^\d{1,4}(?:\.\d{1,4})?$/.test(normalized)) {
      return NaN;
    }
    return parseFloat(normalized);
  }

  function parseWholeNumberInput(value) {
    var normalized = String(value || "").trim();
    if (!normalized) {
      return null;
    }
    if (!/^\d+$/.test(normalized)) {
      return NaN;
    }
    return parseInt(normalized, 10);
  }

  function renderStats() {
    if (!state.user) {
      els.statsGrid.innerHTML = "";
      return;
    }

    var sessions = getDashboardSessions();
    var eodReports = getDashboardEodReports();
    var comments = getDashboardComments();
    var incidents = getDashboardIncidents();
    var selectedSchoolId = getSelectedAdminSchoolId();
    var visibleSchools = getVisibleSchools();
    var ratedSessions = sessions.filter(function (session) {
      return typeof session.engagementRating === "number";
    });
    var eodReports = getDashboardEodReports();
    var averageEngagement = ratedSessions.length
      ? formatNumeric(average(ratedSessions.map(function (session) { return session.engagementRating; })), 2) + " / 5"
      : "Not rated";
    var coachCount = state.data.users.filter(function (user) {
      return user.role === "coach";
    }).length;
    var metrics;

    if (state.user.role === "admin") {
      metrics = [
        { label: "Schools", value: visibleSchools.length || state.data.schools.length, detail: selectedSchoolId ? "In the filtered view" : "Live in the backend" },
        { label: "Coaches", value: coachCount, detail: "Staff performance is scored automatically" },
        { label: "Skills", value: state.data.skills.length, detail: "Editable assessment library" },
        { label: "Class entries", value: sessions.length, detail: "Saved PE sessions" },
        { label: "EOD reports", value: eodReports.length, detail: "Coach completion reports" },
        {
          label: "Avg engagement",
          value: averageEngagement,
          detail: selectedSchoolId ? "For the selected school" : "Across the visible dashboard"
        },
        {
          label: "Unread alerts",
          value: (state.data.alerts || []).filter(function (alert) {
            return !selectedSchoolId || alert.schoolId === selectedSchoolId;
          }).length,
          detail: "Coach incidents waiting for review"
        }
      ];
    } else {
      metrics = [
        {
          label: "Assigned school",
          value: state.user.schoolName || "Unassigned",
          detail: "Your coaching workspace"
        },
        { label: "Classes saved", value: sessions.length, detail: "Your PE submissions" },
        { label: "EOD reports", value: eodReports.length, detail: "Submitted end-of-day reports" },
        { label: "Avg engagement", value: averageEngagement, detail: "From your recorded sessions" },
        { label: "Program notes", value: comments.length, detail: "Saved coaching updates" },
        { label: "Incidents", value: incidents.length, detail: "Submitted incident reports" },
        { label: "Skills", value: state.data.skills.length, detail: "Available assessment library" }
      ];
    }

    els.statsGrid.innerHTML = "";
    metrics.forEach(function (metric) {
      var clone = els.metricTemplate.content.cloneNode(true);
      clone.querySelector(".stat-label").textContent = metric.label;
      clone.querySelector(".stat-value").textContent = metric.value;
      clone.querySelector(".stat-detail").textContent = metric.detail;
      els.statsGrid.appendChild(clone);
    });
  }

  function renderInsights() {
    if (!state.user) {
      els.insightsList.innerHTML = "";
      return;
    }

    if (state.user.role === "coach") {
      var coachSessions = getDashboardSessions();
      var coachEodReports = getDashboardEodReports();
      var latestSession = coachSessions[0];
      var latestEodReport = coachEodReports[0];
      var coachIncidents = getDashboardIncidents();
      var coachCards = [
        {
          title: "Assigned school",
          text: state.user.schoolName
            ? "You are scoped to " + state.user.schoolName + " for submissions, notes, and incident reporting."
            : "Assign a school to this coach account so class data stays organized."
        },
        {
          title: "Latest submission",
          text: latestSession
            ? "Your most recent class entry was saved on " + formatLongDate(latestSession.date) + "."
            : "No class data has been saved yet. Start in Capture to log the next PE class."
        },
        {
          title: "End-of-day completion",
          text: latestEodReport
            ? "Your most recent end-of-day report was submitted on " + formatLongDate(latestEodReport.date) + ". That submission feeds the completion side of your admin score."
            : "Submit an end-of-day report after class to activate the completion side of your admin score."
        },
        {
          title: "Incident readiness",
          text: coachIncidents.length
            ? "You have " + coachIncidents.length + " incident report" + (coachIncidents.length === 1 ? "" : "s") + " on file in this workspace."
            : "No incidents are logged right now. Use the Incident Center only when an alert needs admin review."
        }
      ];

      els.insightsList.innerHTML = coachCards.map(function (card) {
        return [
          '<div class="list-item">',
          "<h3>" + escapeHtml(card.title) + "</h3>",
          "<p>" + escapeHtml(card.text) + "</p>",
          "</div>"
        ].join("");
      }).join("");
      return;
    }

    var summaries = getAllGradeSummaries(getSelectedAdminSchoolId());
    var upCounts = countSkillDirections(summaries, "up");
    var downCounts = countSkillDirections(summaries, "down");
    var filteredSessions = getDashboardSessions();
    var filteredComments = getDashboardComments();
    var visibleSchools = getVisibleSchools();
    var schoolCounts = visibleSchools.map(function (school) {
      return {
        school: school,
        count: filteredSessions.filter(function (session) {
          return session.schoolId === school.id;
        }).length
      };
    }).sort(function (a, b) {
      return b.count - a.count;
    });

    var cards = [
      {
        title: "Most active school",
        text: schoolCounts.length ? schoolCounts[0].school.name + " has the most logged PE sessions in the live data." : "No sessions have been logged yet."
      },
      {
        title: "Strongest trend",
        text: upCounts.length ? upCounts[0].name + " is improving most often across the latest reports." : "Add more class entries to surface skill trends."
      },
      {
        title: "Biggest opportunity",
        text: downCounts.length ? downCounts[0].name + " shows up most often as the next focus area." : "No common weak area is showing yet."
      },
      {
        title: "Communication coverage",
        text: filteredComments.length + " coach note" + (filteredComments.length === 1 ? "" : "s") + " and " + getDashboardEodReports().length + " end-of-day report" + (getDashboardEodReports().length === 1 ? "" : "s") + " are available in the staff activity flow."
      }
    ];

    els.insightsList.innerHTML = cards.map(function (card) {
      return [
        '<div class="list-item">',
        "<h3>" + escapeHtml(card.title) + "</h3>",
        "<p>" + escapeHtml(card.text) + "</p>",
        "</div>"
      ].join("");
    }).join("");
  }

  function renderQuickActions() {
    if (!els.quickActions || !state.user) {
      return;
    }

    var actions = state.user.role === "admin"
      ? [
          {
            view: "reports",
            title: "Open reports",
            text: "Filter by school, compare district trends, and review coach performance."
          },
          {
            view: "setup",
            title: "Manage setup",
            text: "Add schools, grades, skills, and staff accounts from one admin section."
          },
          {
            view: "incidents",
            title: "Review incidents",
            text: "Check unread alerts and recent incident reports without digging through the app."
          }
        ]
      : [
          {
            view: "capture",
            title: "Capture class data",
            text: "Use OCR or manual entry to save the next PE session and update your admin score."
          },
          {
            view: "activity",
            title: "Submit end-of-day report",
            text: "Finish the day with an end-of-day report and save a coaching update for the program feed."
          },
          {
            view: "incidents",
            title: "Open incident center",
            text: "Send an alert to admin right away if something happens during class."
          }
        ];

    els.quickActions.innerHTML = actions.map(function (action) {
      return [
        '<button type="button" class="action-card" data-action="nav-view" data-view-target="' + escapeHtml(action.view) + '">',
        "<strong>" + escapeHtml(action.title) + "</strong>",
        "<span>" + escapeHtml(action.text) + "</span>",
        "</button>"
      ].join("");
    }).join("");
  }

  function renderAdminHandoffFeed() {
    if (!els.adminHandoffFeed) {
      return;
    }

    if (!state.user || state.user.role !== "admin") {
      els.adminHandoffFeed.innerHTML = "";
      return;
    }

    var latestIncident = getDashboardIncidents()[0];
    var latestEodReport = getFilteredAdminEodReports()[0] || getDashboardEodReports()[0];
    var items = [];

    if (latestEodReport) {
      items.push({
        title: "Latest end-of-day report",
        detail: [
          latestEodReport.schoolName || getSchoolById(latestEodReport.schoolId).name,
          formatLongDate(latestEodReport.date),
          latestEodReport.createdByName ? "By " + latestEodReport.createdByName : null
        ].filter(Boolean).join(" • "),
        body: latestEodReport.summary,
        fresh: isFreshCoachSubmission(latestEodReport.createdAt, latestEodReport.date),
        unread: false
      });
    }

    if (latestIncident) {
      items.push({
        title: "Latest incident",
        detail: [
          getSchoolById(latestIncident.schoolId).name,
          formatLongDate(latestIncident.date),
          latestIncident.createdByName ? "Submitted by " + latestIncident.createdByName : null
        ].filter(Boolean).join(" • "),
        body: latestIncident.title + " — " + latestIncident.details,
        fresh: isFreshCoachSubmission(latestIncident.createdAt, latestIncident.date),
        unread: hasUnreadAlertForIncident(latestIncident.id)
      });
    }

    if (!items.length) {
      els.adminHandoffFeed.innerHTML = '<div class="empty-state">Coach handoff items will appear here after reports or incidents are submitted.</div>';
      return;
    }

    els.adminHandoffFeed.innerHTML = items.map(function (item) {
      var badgeGroup = [];
      if (item.fresh) {
        badgeGroup.push('<span class="pill fresh-pill">New Submission Received</span>');
      }
      if (item.unread) {
        badgeGroup.push('<span class="pill alert-pill">Needs Admin Review</span>');
      }
      return [
        '<div class="list-item">',
        '<div class="list-title-row">',
        "<h3>" + escapeHtml(item.title) + "</h3>",
        badgeGroup.length ? '<div class="pill-row">' + badgeGroup.join("") + "</div>" : "",
        "</div>",
        "<p>" + escapeHtml(item.detail) + "</p>",
        "<p>" + escapeHtml(item.body) + "</p>",
        "</div>"
      ].join("");
    }).join("");
  }

  function getCoachPerformanceSummary() {
    if (state.data.coachPerformance) {
      return state.data.coachPerformance;
    }
    if (!state.user || state.user.role !== "coach") {
      return null;
    }
    return buildCoachPerformanceSummaryFromData(state.data.sessions, state.data.eodReports);
  }

  function getProjectedCoachPerformance(pendingEngagement) {
    if (!state.user || state.user.role !== "coach") {
      return null;
    }

    var sessions = state.data.sessions.slice();
    var eodReports = state.data.eodReports.slice();
    if (typeof pendingEngagement === "number" && !isNaN(pendingEngagement)) {
      sessions.push({
        date: els.sessionDate && els.sessionDate.value ? els.sessionDate.value : new Date().toISOString().slice(0, 10),
        engagementRating: pendingEngagement
      });
    }

    return buildCoachPerformanceSummaryFromData(sessions, eodReports);
  }

  function getProjectedCoachPerformanceWithEod() {
    if (!state.user || state.user.role !== "coach") {
      return null;
    }

    var sessions = state.data.sessions.slice();
    var eodReports = state.data.eodReports.slice();
    var reportDate = els.eodDate && els.eodDate.value ? els.eodDate.value : new Date().toISOString().slice(0, 10);
    var existsForDate = eodReports.some(function (report) {
      return report.date === reportDate;
    });
    if (!existsForDate) {
      eodReports.push({
        date: reportDate
      });
    }
    return buildCoachPerformanceSummaryFromData(sessions, eodReports);
  }

  function buildCoachPerformanceSummaryFromData(sessions, eodReports) {
    var cutoffDate = buildIsoDateOffset(-30);
    var engagementScores = sessions.filter(function (session) {
      return typeof session.engagementRating === "number" && !isNaN(session.engagementRating);
    }).map(function (session) {
      return session.engagementRating;
    });
    var averageEngagement = engagementScores.length ? average(engagementScores) : null;
    var recentReportCount = eodReports.filter(function (report) {
      return String(report.date || "") >= cutoffDate;
    }).length;
    var completionRate = Math.min(recentReportCount / expectedCoachSubmissions, 1);
    var engagementPoints = roundTo(((averageEngagement || 0) / 5) * 50, 1);
    var completionPoints = roundTo(completionRate * 50, 1);
    var lastSessionDate = sessions.reduce(function (latest, session) {
      if (!session.date) {
        return latest;
      }
      if (!latest || String(session.date) > String(latest)) {
        return session.date;
      }
      return latest;
    }, "");
    var lastEodReportDate = eodReports.reduce(function (latest, report) {
      if (!report.date) {
        return latest;
      }
      if (!latest || String(report.date) > String(latest)) {
        return report.date;
      }
      return latest;
    }, "");

    return {
      coachId: state.user ? state.user.id : null,
      coachName: state.user ? state.user.name : "",
      schoolId: state.user ? state.user.schoolId : null,
      schoolName: state.user ? state.user.schoolName : "",
      averageEngagement: averageEngagement === null ? null : roundTo(averageEngagement, 2),
      completionRate: roundTo(completionRate, 3),
      completionPercent: roundTo(completionRate * 100, 1),
      recentEodCount: recentReportCount,
      recentReportCount: recentReportCount,
      expectedSubmissions: expectedCoachSubmissions,
      engagementPoints: engagementPoints,
      completionPoints: completionPoints,
      performanceScore: roundTo(engagementPoints + completionPoints, 1),
      lastSessionDate: lastSessionDate || null,
      lastEodReportDate: lastEodReportDate || null,
      totalSessions: sessions.length,
      totalEodReports: eodReports.length
    };
  }

  function getSelectedAdminSchoolId() {
    if (!state.user || state.user.role !== "admin" || !els.adminSchoolFilter) {
      return null;
    }

    var selected = els.adminSchoolFilter.value || state.selectedAdminSchoolId || "";
    var parsed = parseInt(selected, 10);
    return parsed || null;
  }

  function getVisibleSchools() {
    var selectedSchoolId = getSelectedAdminSchoolId();
    if (!selectedSchoolId) {
      return state.data.schools.slice();
    }
    return state.data.schools.filter(function (school) {
      return school.id === selectedSchoolId;
    });
  }

  function getDashboardSessions() {
    var selectedSchoolId = getSelectedAdminSchoolId();
    return state.data.sessions.filter(function (session) {
      return !selectedSchoolId || session.schoolId === selectedSchoolId;
    });
  }

  function getDashboardComments() {
    var selectedSchoolId = getSelectedAdminSchoolId();
    return state.data.comments.filter(function (comment) {
      return !selectedSchoolId || comment.schoolId === selectedSchoolId;
    });
  }

  function getDashboardEodReports() {
    var selectedSchoolId = getSelectedAdminSchoolId();
    return state.data.eodReports.filter(function (report) {
      return !selectedSchoolId || report.schoolId === selectedSchoolId;
    });
  }

  function getFilteredAdminEodReports() {
    var reports = getDashboardEodReports().slice();
    if (!state.user || state.user.role !== "admin") {
      return reports;
    }

    var selectedCoachId = els.eodCoachFilter && els.eodCoachFilter.value ? parseInt(els.eodCoachFilter.value, 10) : null;
    var selectedWindow = els.eodWindowFilter ? els.eodWindowFilter.value : "30";
    var cutoff = selectedWindow === "all" ? "" : buildIsoDateOffset(0 - parseInt(selectedWindow, 10));

    return reports.filter(function (report) {
      if (selectedCoachId && report.createdById !== selectedCoachId) {
        return false;
      }
      if (cutoff && String(report.date || "") < cutoff) {
        return false;
      }
      return true;
    });
  }

  function getDashboardIncidents() {
    var selectedSchoolId = getSelectedAdminSchoolId();
    return state.data.incidents.filter(function (incident) {
      return !selectedSchoolId || incident.schoolId === selectedSchoolId;
    });
  }

  function renderAlertBanners() {
    if (!els.alertBanners) {
      return;
    }

    if (!state.user || state.user.role !== "admin" || (state.currentView !== "overview" && state.currentView !== "incidents")) {
      els.alertBanners.innerHTML = "";
      return;
    }

    var selectedSchoolId = getSelectedAdminSchoolId();
    var alerts = (state.data.alerts || []).filter(function (alert) {
      return !selectedSchoolId || alert.schoolId === selectedSchoolId;
    });

    if (!alerts.length) {
      els.alertBanners.innerHTML = "";
      return;
    }

    els.alertBanners.innerHTML = alerts.map(function (alert) {
      return [
        '<div class="alert-banner">',
        '<div class="alert-copy">',
        '<p class="section-tag">Unread Incident Alert</p>',
        "<h3>" + escapeHtml(alert.title) + "</h3>",
        "<p>" + escapeHtml(alert.schoolName || "Assigned school") + " • " + escapeHtml(formatLongDate(alert.incidentDate)) + (alert.coachName ? " • Submitted by " + escapeHtml(alert.coachName) : "") + "</p>",
        "</div>",
        '<button type="button" class="ghost-btn" data-action="mark-alert-seen" data-incident-id="' + escapeHtml(String(alert.incidentId)) + '">Seen And Noted</button>',
        "</div>"
      ].join("");
    }).join("");
  }

  function renderEngagementSummary() {
    if (!els.engagementSummary) {
      return;
    }

    var sessions = getDashboardSessions();
    var eodReports = getDashboardEodReports();
    var incidents = getDashboardIncidents();

    var ratedSessions = sessions.filter(function (session) {
      return typeof session.engagementRating === "number";
    });
    var averageEngagement = ratedSessions.length
      ? average(ratedSessions.map(function (session) { return session.engagementRating; }))
      : null;
    var selectedSchoolId = getSelectedAdminSchoolId();
    var scopeLabel = selectedSchoolId ? getSchoolById(selectedSchoolId).name : "All schools";
    var unreadAlerts = (state.data.alerts || []).filter(function (alert) {
      return !selectedSchoolId || alert.schoolId === selectedSchoolId;
    }).length;

    if (!sessions.length && !eodReports.length && !incidents.length) {
      els.engagementSummary.innerHTML = [
        "<h3>" + escapeHtml(scopeLabel) + "</h3>",
        "<p>No coach activity is in scope yet for this filter.</p>",
        "<p><strong>What to do next:</strong> have a coach save class data, submit an end-of-day report, or log an incident so the admin dashboard can populate.</p>"
      ].join("");
      return;
    }

    els.engagementSummary.innerHTML = [
      "<h3>" + escapeHtml(scopeLabel) + "</h3>",
      "<p><strong>" + escapeHtml(String(sessions.length)) + "</strong> coach submission" + (sessions.length === 1 ? "" : "s") + " are in scope for this view.</p>",
      "<p><strong>" + escapeHtml(String(eodReports.length)) + "</strong> end-of-day report" + (eodReports.length === 1 ? "" : "s") + " are in scope for this view.</p>",
      "<p><strong>" + escapeHtml(String(incidents.length)) + "</strong> incident report" + (incidents.length === 1 ? "" : "s") + " are in scope for this view.</p>",
      "<p><strong>Average engagement:</strong> " + escapeHtml(averageEngagement === null ? "Not rated yet" : formatNumeric(averageEngagement, 2) + " / 5") + "</p>",
      "<p><strong>Unread incident alerts:</strong> " + escapeHtml(String(unreadAlerts)) + "</p>"
    ].join("");
  }

  function renderIncidentReviewSummary() {
    if (!els.incidentReviewSummary) {
      return;
    }

    if (!state.user || state.user.role !== "admin") {
      els.incidentReviewSummary.innerHTML = "";
      return;
    }

    var selectedSchoolId = getSelectedAdminSchoolId();
    var scopeLabel = selectedSchoolId ? getSchoolById(selectedSchoolId).name : "All schools";
    var incidents = getDashboardIncidents();
    var unreadAlerts = (state.data.alerts || []).filter(function (alert) {
      return !selectedSchoolId || alert.schoolId === selectedSchoolId;
    }).length;
    var followUpCount = incidents.filter(function (incident) {
      return incident.adminStatus === "follow_up";
    }).length;
    var closedCount = incidents.filter(function (incident) {
      return incident.adminStatus === "closed";
    }).length;

    els.incidentReviewSummary.innerHTML = [
      "<h3>" + escapeHtml(scopeLabel) + "</h3>",
      "<p><strong>" + escapeHtml(String(incidents.length)) + "</strong> incident report" + (incidents.length === 1 ? "" : "s") + " are currently in this admin view.</p>",
      "<p><strong>Unread alerts:</strong> " + escapeHtml(String(unreadAlerts)) + " still need admin acknowledgement.</p>",
      "<p><strong>Follow-up planned:</strong> " + escapeHtml(String(followUpCount)) + " incident" + (followUpCount === 1 ? "" : "s") + " are waiting on the next action.</p>",
      "<p><strong>Closed:</strong> " + escapeHtml(String(closedCount)) + " incident" + (closedCount === 1 ? "" : "s") + " have been fully resolved.</p>",
      "<p><strong>Filter note:</strong> the school filter set in Reports stays active here, so incident review always matches the rest of the admin dashboard.</p>"
    ].join("");
  }

  function renderCoachScoreOverview() {
    if (!els.coachScoreOverview) {
      return;
    }

    if (!state.user || state.user.role !== "coach") {
      els.coachScoreOverview.innerHTML = "";
      return;
    }

    var performance = getCoachPerformanceSummary();
    if (!performance || (!performance.totalSessions && !performance.totalEodReports)) {
      els.coachScoreOverview.innerHTML = [
        "<h3>Your score starts after the first class save</h3>",
        "<p>As soon as you save one PE class, your engagement side is ready. Once you submit an end-of-day report, the completion side of your score starts updating too.</p>",
        "<p><strong>Formula:</strong> up to 50 points from average engagement plus up to 50 points from end-of-day report completion in the last 30 days.</p>"
      ].join("");
      return;
    }

    var lastSavedNote = "";
    if (state.lastSavedCoachPerformance && state.lastSavedCoachPerformance.coachId === state.user.id) {
      lastSavedNote = '<p class="score-flow-note"><strong>Latest submission processed:</strong> your admin score just refreshed to ' + escapeHtml(formatNumeric(state.lastSavedCoachPerformance.performanceScore, 1)) + ".</p>";
    }

    els.coachScoreOverview.innerHTML = [
      "<h3>Admin sees this score update live</h3>",
      "<p>Class entries update engagement data, and end-of-day reports update completion. Admin sees both pieces in the same live scorecard.</p>",
      '<div class="score-kpi-grid">',
      '<div class="score-kpi"><span class="score-kpi-label">Current score</span><strong>' + escapeHtml(formatNumeric(performance.performanceScore, 1)) + "</strong></div>",
      '<div class="score-kpi"><span class="score-kpi-label">Engagement points</span><strong>' + escapeHtml(formatNumeric(performance.engagementPoints, 1)) + "</strong></div>",
      '<div class="score-kpi"><span class="score-kpi-label">Completion points</span><strong>' + escapeHtml(formatNumeric(performance.completionPoints, 1)) + "</strong></div>",
      "</div>",
      "<p><strong>Average engagement:</strong> " + escapeHtml(performance.averageEngagement === null ? "Not rated yet" : formatNumeric(performance.averageEngagement, 2) + " / 5") + "</p>",
      "<p><strong>Recent end-of-day reports:</strong> " + escapeHtml(String(performance.recentReportCount || 0)) + " of " + escapeHtml(String(performance.expectedSubmissions)) + " expected in the last 30 days.</p>",
      "<p><strong>Last class saved:</strong> " + escapeHtml(performance.lastSessionDate ? formatLongDate(performance.lastSessionDate) : "No class saved yet") + "</p>",
      "<p><strong>Last end-of-day report:</strong> " + escapeHtml(performance.lastEodReportDate ? formatLongDate(performance.lastEodReportDate) : "No report submitted yet") + "</p>",
      lastSavedNote
    ].join("");
  }

  function renderCoachScoreImpact() {
    if (!els.coachScoreImpact) {
      return;
    }

    if (!state.user || state.user.role !== "coach") {
      els.coachScoreImpact.innerHTML = "";
      return;
    }

    var current = getCoachPerformanceSummary();
    var pendingEngagement = els.sessionEngagement && els.sessionEngagement.value ? parseFloat(els.sessionEngagement.value) : null;
    var projected = getProjectedCoachPerformance(pendingEngagement);

    if (pendingEngagement === null || isNaN(pendingEngagement)) {
      els.coachScoreImpact.innerHTML = [
        "<h3>Preview the next class entry</h3>",
        "<p>Select an engagement rating and enter class scores above. This panel shows how the class save affects the engagement side of your admin score.</p>",
        "<p><strong>Current score:</strong> " + escapeHtml(current && (current.totalSessions || current.totalEodReports) ? formatNumeric(current.performanceScore, 1) : "No score yet") + "</p>"
      ].join("");
      return;
    }

    var currentScore = current && (current.totalSessions || current.totalEodReports) ? current.performanceScore : 0;
    var scoreDelta = projected.performanceScore - currentScore;

    els.coachScoreImpact.innerHTML = [
      "<h3>This class will update your admin score</h3>",
      "<p>Saving this class updates your engagement average. The completion side of your score is driven by end-of-day report submission.</p>",
      '<div class="score-preview-row">',
      '<div class="score-preview-card"><span class="score-kpi-label">Current</span><strong>' + escapeHtml(current && (current.totalSessions || current.totalEodReports) ? formatNumeric(current.performanceScore, 1) : "No score yet") + "</strong></div>",
      '<div class="score-preview-arrow">→</div>',
      '<div class="score-preview-card accent"><span class="score-kpi-label">Projected after save</span><strong>' + escapeHtml(formatNumeric(projected.performanceScore, 1)) + "</strong></div>",
      "</div>",
      '<p class="score-flow-note"><strong>Projected change:</strong> ' + escapeHtml((scoreDelta >= 0 ? "+" : "") + formatNumeric(scoreDelta, 1)) + " points</p>",
      "<p><strong>Engagement contribution:</strong> " + escapeHtml(formatNumeric(projected.engagementPoints, 1)) + " points from an average of " + escapeHtml(projected.averageEngagement === null ? "0" : formatNumeric(projected.averageEngagement, 2)) + " / 5.</p>",
      "<p><strong>Completion contribution:</strong> " + escapeHtml(formatNumeric(projected.completionPoints, 1)) + " points from " + escapeHtml(String(projected.recentReportCount || 0)) + "/" + escapeHtml(String(projected.expectedSubmissions)) + " submitted end-of-day reports.</p>"
    ].join("");
  }

  function renderEodScoreImpact() {
    if (!els.eodScoreImpact) {
      return;
    }

    if (!state.user || state.user.role !== "coach") {
      els.eodScoreImpact.innerHTML = "";
      return;
    }

    var current = getCoachPerformanceSummary();
    var projected = getProjectedCoachPerformanceWithEod();
    var currentScore = current && (current.totalSessions || current.totalEodReports) ? current.performanceScore : 0;
    var currentReportCount = current ? (current.recentReportCount || 0) : 0;
    var projectedReportCount = projected ? (projected.recentReportCount || 0) : currentReportCount;
    var duplicateDate = projectedReportCount === currentReportCount && currentReportCount > 0;

    if (!els.eodDate || !els.eodDate.value) {
      els.eodScoreImpact.innerHTML = [
        "<h3>Preview the end-of-day score update</h3>",
        "<p>Choose a report date and complete the form above. This panel will show how the end-of-day report changes the completion side of your admin score.</p>"
      ].join("");
      return;
    }

    els.eodScoreImpact.innerHTML = [
      "<h3>This report drives the completion score</h3>",
      "<p>Submitting the end-of-day report adds one completion entry for the selected date and updates the coach score admin sees.</p>",
      '<div class="score-preview-row">',
      '<div class="score-preview-card"><span class="score-kpi-label">Current</span><strong>' + escapeHtml(current && (current.totalSessions || current.totalEodReports) ? formatNumeric(current.performanceScore, 1) : "No score yet") + "</strong></div>",
      '<div class="score-preview-arrow">→</div>',
      '<div class="score-preview-card accent"><span class="score-kpi-label">Projected after report</span><strong>' + escapeHtml(formatNumeric(projected.performanceScore, 1)) + "</strong></div>",
      "</div>",
      '<p class="score-flow-note"><strong>Recent end-of-day reports:</strong> ' + escapeHtml(String(currentReportCount)) + " → " + escapeHtml(String(projectedReportCount)) + (duplicateDate ? " for this date is already on file." : "") + "</p>",
      "<p><strong>Engagement points:</strong> " + escapeHtml(formatNumeric(projected.engagementPoints, 1)) + " based on saved class entries.</p>",
      "<p><strong>Completion points:</strong> " + escapeHtml(formatNumeric(projected.completionPoints, 1)) + " based on " + escapeHtml(String(projectedReportCount)) + "/" + escapeHtml(String(projected.expectedSubmissions)) + " submitted end-of-day reports.</p>"
    ].join("");
  }

  function renderPerformanceExplainer() {
    if (!els.performanceExplainer) {
      return;
    }

    if (!state.user || state.user.role !== "admin") {
      els.performanceExplainer.innerHTML = "";
      return;
    }

    var selectedSchoolId = getSelectedAdminSchoolId();
    var scopeLabel = selectedSchoolId ? getSchoolById(selectedSchoolId).name : "All schools";

    els.performanceExplainer.innerHTML = [
      "<h3>How coaching scores are processed</h3>",
      "<p>Every time a coach saves class data or submits an end-of-day report, this scorecard recalculates automatically for " + escapeHtml(scopeLabel) + ".</p>",
      "<p><strong>Score formula:</strong> up to 50 points from average engagement rating plus up to 50 points from end-of-day report completion in the last 30 days.</p>",
      "<p><strong>Completion target:</strong> " + escapeHtml(String(expectedCoachSubmissions)) + " submitted end-of-day reports in 30 days.</p>",
      "<p><strong>Admin review flow:</strong> use the end-of-day report section below to filter reports by school, coach, and date window.</p>"
    ].join("");
  }

  function renderPerformanceTable() {
    if (!els.performanceTable) {
      return;
    }

    if (!state.user || state.user.role !== "admin") {
      els.performanceTable.innerHTML = "";
      return;
    }

    var selectedSchoolId = getSelectedAdminSchoolId();
    var rows = (state.data.performanceRows || []).filter(function (row) {
      return !selectedSchoolId || row.schoolId === selectedSchoolId;
    });

    if (!rows.length) {
      els.performanceTable.innerHTML = '<div class="empty-state">Coach scorecards will appear after coaches begin submitting class data and end-of-day reports.</div>';
      return;
    }

    els.performanceTable.innerHTML = [
      '<div class="performance-header performance-row">',
      "<span>Coach</span>",
      "<span>School</span>",
      "<span>Engagement</span>",
      "<span>End-of-day completion</span>",
      "<span>Score</span>",
      "</div>",
      rows.map(function (row) {
        return [
          '<div class="performance-row">',
          '<span class="performance-cell"><strong>' + escapeHtml(row.coachName) + '</strong><small>Last end-of-day report: ' + escapeHtml(row.lastEodReportDate ? formatLongDate(row.lastEodReportDate) : "No report yet") + "</small></span>",
          '<span class="performance-cell"><strong>' + escapeHtml(row.schoolName || "Unassigned") + '</strong><small>Live coach scope</small></span>',
          '<span class="performance-cell"><strong>' + escapeHtml(row.averageEngagement === null ? "No ratings yet" : formatNumeric(row.averageEngagement, 2) + " / 5") + '</strong><small>' + escapeHtml(formatNumeric(row.engagementPoints || 0, 1)) + " pts from engagement</small></span>",
          '<span class="performance-cell"><strong>' + escapeHtml(formatNumeric(row.completionPercent, 1)) + "% (" + escapeHtml(String(row.recentReportCount || row.recentEodCount || 0)) + "/" + escapeHtml(String(row.expectedSubmissions)) + ')</strong><small>' + escapeHtml(formatNumeric(row.completionPoints || 0, 1)) + " pts from end-of-day completion</small></span>",
          '<span class="performance-cell performance-score-cell"><span class="score-pill ' + escapeHtml(getPerformanceBand(row.performanceScore)) + '">' + escapeHtml(formatNumeric(row.performanceScore, 1)) + '</span><small>' + escapeHtml(formatNumeric(row.engagementPoints || 0, 1)) + " + " + escapeHtml(formatNumeric(row.completionPoints || 0, 1)) + " = total</small></span>",
          "</div>"
        ].join("");
      }).join("")
    ].join("");
  }

  function renderSchoolsList() {
    if (!state.data.schools.length) {
      els.schoolsList.innerHTML = '<div class="empty-state">No schools added yet.</div>';
      return;
    }

    els.schoolsList.innerHTML = state.data.schools.map(function (school) {
      return [
        '<div class="list-item">',
        '<div class="list-title-row">',
        "<h3>" + escapeHtml(school.name) + "</h3>",
        '<button type="button" class="ghost-btn" data-action="delete-school" data-id="' + escapeHtml(String(school.id)) + '">Remove</button>',
        "</div>",
        "<p>" + escapeHtml(school.district) + "</p>",
        "</div>"
      ].join("");
    }).join("");
  }

  function renderGradesList() {
    if (!state.data.grades.length) {
      els.gradesList.innerHTML = '<div class="empty-state">No grades added yet.</div>';
      return;
    }

    els.gradesList.innerHTML = state.data.grades.map(function (grade) {
      return [
        '<div class="list-item">',
        '<div class="list-title-row">',
        "<h3>" + escapeHtml(grade.name) + "</h3>",
        '<button type="button" class="ghost-btn" data-action="delete-grade" data-id="' + escapeHtml(String(grade.id)) + '">Remove</button>',
        "</div>",
        "<p>Display order: " + escapeHtml(String(grade.order)) + "</p>",
        "</div>"
      ].join("");
    }).join("");
  }

  function renderSkillsList() {
    if (!state.data.skills.length) {
      els.skillsList.innerHTML = '<div class="empty-state">No skills added yet.</div>';
      return;
    }

    els.skillsList.innerHTML = state.data.skills.map(function (skill) {
      var directionText = skill.betterDirection === "lower" ? "Lower scores show improvement" : "Higher scores show improvement";
      return [
        '<div class="list-item">',
        '<div class="list-title-row">',
        "<h3>" + escapeHtml(skill.name) + "</h3>",
        '<div class="inline-actions">',
        '<button type="button" class="ghost-btn" data-action="edit-skill" data-id="' + escapeHtml(String(skill.id)) + '">Edit</button>',
        '<button type="button" class="ghost-btn" data-action="delete-skill" data-id="' + escapeHtml(String(skill.id)) + '">Remove</button>',
        '</div>',
        "</div>",
        "<p>" + escapeHtml(formatUnit(skill.unit)) + " • " + escapeHtml(directionText) + "</p>",
        "<p>Abbreviation: " + escapeHtml(skill.abbreviation || "Not set") + "</p>",
        "</div>"
      ].join("");
    }).join("");
  }

  function renderUsersList() {
    if (!state.data.users.length) {
      els.usersList.innerHTML = '<div class="empty-state">No logins created yet.</div>';
      return;
    }

    els.usersList.innerHTML = state.data.users.map(function (user) {
      var verificationText = user.emailVerified ? "Email verified" : "Email needs verification";
      var verificationAction = user.emailVerified
        ? '<span class="pill">Verified</span>'
        : '<button type="button" class="ghost-btn" data-action="resend-user-verification" data-email="' + escapeHtml(user.email) + '">Resend Verification</button>';
      return [
        '<div class="list-item">',
        '<div class="list-title-row">',
        "<div>",
        "<h3>" + escapeHtml(user.name) + "</h3>",
        "<p>" + escapeHtml(formatRole(user.role)) + " • @" + escapeHtml(user.username || "staff") + " • " + escapeHtml(user.email) + "</p>",
        "</div>",
        '<div class="inline-actions">',
        verificationAction,
        '<button type="button" class="ghost-btn" data-action="delete-user" data-id="' + escapeHtml(String(user.id)) + '">Remove</button>',
        "</div>",
        "</div>",
        "<p>" + escapeHtml(verificationText) + "</p>",
        "<p>" + escapeHtml(describeUserAccess(user)) + "</p>",
        "</div>"
      ].join("");
    }).join("");
  }

  function renderSessionsList() {
    var sessions = getDashboardSessions();

    if (!sessions.length) {
      els.sessionsList.innerHTML = '<div class="empty-state">No PE sessions recorded yet.</div>';
      return;
    }

    els.sessionsList.innerHTML = sessions.slice(0, 8).map(function (session) {
      var school = getSchoolById(session.schoolId);
      var grade = getGradeById(session.gradeId);
      var results = session.results.slice(0, 3).map(function (result) {
        var skill = getSkillById(result.skillId);
        return skill.name + ": " + formatScore(result.score, skill.unit);
      }).join(" • ");
      var meta = [
        formatLongDate(session.date),
        session.engagementRating ? "Engagement " + formatNumeric(session.engagementRating, 1) + "/5" : null,
        session.createdByName ? "Submitted by " + session.createdByName : null
      ].filter(Boolean).join(" • ");

      return [
        '<div class="list-item">',
        '<div class="list-title-row">',
        "<div>",
        "<h3>" + escapeHtml(school.name) + " • " + escapeHtml(grade.name) + "</h3>",
        "<p>" + escapeHtml(meta) + "</p>",
        "</div>",
        '<button type="button" class="ghost-btn" data-action="delete-session" data-id="' + escapeHtml(String(session.id)) + '">Delete</button>',
        "</div>",
        "<p>" + escapeHtml(session.coachNote || "No note added") + "</p>",
        "<p>" + escapeHtml(results) + "</p>",
        "</div>"
      ].join("");
    }).join("");
  }

  function renderCommentsList() {
    var comments = getDashboardComments();

    if (!comments.length) {
      els.commentsList.innerHTML = '<div class="empty-state">No coach program updates have been saved yet.</div>';
      return;
    }

    els.commentsList.innerHTML = comments.slice(0, 8).map(function (comment) {
      var school = getSchoolById(comment.schoolId);
      var grade = getGradeById(comment.gradeId);
      var subtitle = [school.name, grade.name, formatLongDate(comment.date), comment.createdByName ? "By " + comment.createdByName : null]
        .filter(Boolean)
        .join(" • ");

      return [
        '<div class="comment-card">',
        '<div class="comment-top">',
        "<div>",
        "<h3>" + escapeHtml(comment.title) + "</h3>",
        "<p>" + escapeHtml(subtitle) + "</p>",
        "</div>",
        '<button type="button" class="ghost-btn" data-action="delete-comment" data-id="' + escapeHtml(String(comment.id)) + '">Delete</button>',
        "</div>",
        "<p>" + escapeHtml(comment.body) + "</p>",
        "<p><strong>Next focus:</strong> " + escapeHtml(comment.homeFocus) + "</p>",
        "</div>"
      ].join("");
    }).join("");
  }

  function renderCoachEodReports() {
    if (!els.coachEodReportsList) {
      return;
    }

    var reports = state.user && state.user.role === "coach"
      ? state.data.eodReports
      : getFilteredAdminEodReports();

    if (!reports.length) {
      els.coachEodReportsList.innerHTML = '<div class="empty-state">No end-of-day reports have been submitted yet.</div>';
      return;
    }

    els.coachEodReportsList.innerHTML = reports.slice(0, 8).map(function (report) {
      var meta = [
        report.schoolName || getSchoolById(report.schoolId).name,
        formatLongDate(report.date),
        report.createdByName ? "By " + report.createdByName : null,
        report.classesCompleted ? report.classesCompleted + " class" + (report.classesCompleted === 1 ? "" : "es") : null
      ].filter(Boolean).join(" • ");

      return [
        '<div class="comment-card">',
        '<div class="comment-top">',
        "<div>",
        "<h3>End-of-Day Report</h3>",
        "<p>" + escapeHtml(meta) + "</p>",
        "</div>",
        state.user && state.user.role === "coach"
          ? '<button type="button" class="ghost-btn" data-action="delete-eod-report" data-id="' + escapeHtml(String(report.id)) + '">Delete</button>'
          : "",
        "</div>",
        "<p><strong>Daily summary:</strong> " + escapeHtml(report.summary) + "</p>",
        "<p><strong>Celebrations:</strong> " + escapeHtml(report.celebrations) + "</p>",
        "<p><strong>Follow-up:</strong> " + escapeHtml(report.followUpNeeded) + "</p>",
        "<p><strong>Admin support:</strong> " + escapeHtml(report.supportNeeded || "No admin support requested.") + "</p>",
        "</div>"
      ].join("");
    }).join("");
  }

  function renderAdminEodReports() {
    if (!els.adminEodReportsList || !els.eodReportSummary) {
      return;
    }

    if (!state.user || state.user.role !== "admin") {
      els.eodReportSummary.innerHTML = "";
      els.adminEodReportsList.innerHTML = "";
      return;
    }

    var reports = getFilteredAdminEodReports();
    var selectedSchoolId = getSelectedAdminSchoolId();
    var scopeLabel = selectedSchoolId ? getSchoolById(selectedSchoolId).name : "All schools";
    var coachLabel = els.eodCoachFilter && els.eodCoachFilter.value
      ? getCoachNameById(parseInt(els.eodCoachFilter.value, 10))
      : "All coaches";
    var windowLabel = els.eodWindowFilter ? els.eodWindowFilter.options[els.eodWindowFilter.selectedIndex].text : "Last 30 days";

    els.eodReportSummary.innerHTML = [
      "<h3>" + escapeHtml(scopeLabel) + " • " + escapeHtml(coachLabel) + "</h3>",
      "<p><strong>" + escapeHtml(String(reports.length)) + "</strong> end-of-day report" + (reports.length === 1 ? "" : "s") + " match the current filters.</p>",
      "<p><strong>Date window:</strong> " + escapeHtml(windowLabel) + "</p>"
    ].join("");

    if (!reports.length) {
      els.adminEodReportsList.innerHTML = '<div class="empty-state">No end-of-day reports match the current filters.</div>';
      return;
    }

    els.adminEodReportsList.innerHTML = reports.map(function (report) {
      var meta = [
        report.schoolName || getSchoolById(report.schoolId).name,
        formatLongDate(report.date),
        report.createdByName ? "By " + report.createdByName : null,
        report.classesCompleted ? report.classesCompleted + " class" + (report.classesCompleted === 1 ? "" : "es") : null
      ].filter(Boolean).join(" • ");
      var badgeGroup = isFreshCoachSubmission(report.createdAt, report.date)
        ? '<div class="pill-row"><span class="pill fresh-pill">New Submission Received</span></div>'
        : "";

      return [
        '<div class="comment-card">',
        '<div class="comment-top">',
        "<div>",
        "<h3>End-of-Day Report</h3>",
        "<p>" + escapeHtml(meta) + "</p>",
        "</div>",
        badgeGroup,
        "</div>",
        "<p><strong>Daily summary:</strong> " + escapeHtml(report.summary) + "</p>",
        "<p><strong>Celebrations:</strong> " + escapeHtml(report.celebrations) + "</p>",
        "<p><strong>Follow-up:</strong> " + escapeHtml(report.followUpNeeded) + "</p>",
        "<p><strong>Admin support:</strong> " + escapeHtml(report.supportNeeded || "No admin support requested.") + "</p>",
        "</div>"
      ].join("");
    }).join("");
  }

  function renderIncidentsList() {
    if (!els.incidentsList) {
      return;
    }

    var incidents = getDashboardIncidents();
    if (!incidents.length) {
      els.incidentsList.innerHTML = '<div class="empty-state">No incident reports have been logged yet.</div>';
      return;
    }

    els.incidentsList.innerHTML = incidents.slice(0, 10).map(function (incident) {
      var school = getSchoolById(incident.schoolId);
      var meta = [
        school.name,
        formatLongDate(incident.date),
        incident.createdByName ? "Submitted by " + incident.createdByName : null
      ].filter(Boolean).join(" • ");
      var statusLabel = getIncidentStatusLabel(incident.adminStatus);
      var statusClass = getIncidentStatusClass(incident.adminStatus);
      var acknowledgement = buildIncidentAcknowledgement(incident);
      var responseBlock = buildIncidentResponseBlock(incident);
      var adminControls = state.user && state.user.role === "admin"
        ? buildIncidentAdminControls(incident)
        : "";
      var badgeGroup = [];
      if (state.user && state.user.role === "admin" && isFreshCoachSubmission(incident.createdAt, incident.date)) {
        badgeGroup.push('<span class="pill fresh-pill">New Submission Received</span>');
      }
      if (state.user && state.user.role === "admin" && hasUnreadAlertForIncident(incident.id)) {
        badgeGroup.push('<span class="pill alert-pill">Needs Admin Review</span>');
      }
      badgeGroup.push('<span class="pill ' + escapeHtml(statusClass) + '">' + escapeHtml(statusLabel) + "</span>");

      return [
        '<div class="comment-card incident-card">',
        '<div class="comment-top">',
        "<div>",
        "<h3>" + escapeHtml(incident.title) + "</h3>",
        "<p>" + escapeHtml(meta) + "</p>",
        "</div>",
        '<div class="pill-row">' + badgeGroup.join("") + "</div>",
        "</div>",
        "<p>" + escapeHtml(incident.details) + "</p>",
        acknowledgement,
        responseBlock,
        adminControls,
        "</div>"
      ].join("");
    }).join("");
  }

  function buildIncidentAcknowledgement(incident) {
    if (!incident.acknowledgedAt && !incident.acknowledgedByName) {
      return '<p class="incident-meta-line"><strong>Admin review:</strong> Not acknowledged yet.</p>';
    }

    var parts = [];
    if (incident.acknowledgedByName) {
      parts.push("Seen by " + incident.acknowledgedByName);
    }
    if (incident.acknowledgedAt) {
      parts.push(formatDateTime(incident.acknowledgedAt));
    }

    return '<p class="incident-meta-line"><strong>Admin review:</strong> ' + escapeHtml(parts.join(" • ")) + "</p>";
  }

  function buildIncidentResponseBlock(incident) {
    var lines = [];

    if (incident.adminResponse) {
      lines.push('<p class="incident-meta-line"><strong>Admin reply:</strong> ' + escapeHtml(incident.adminResponse) + "</p>");
    }
    if (incident.followUpDate || incident.followUpNote) {
      var followUpParts = [];
      if (incident.followUpDate) {
        followUpParts.push("Follow-up date: " + formatLongDate(incident.followUpDate));
      }
      if (incident.followUpNote) {
        followUpParts.push(incident.followUpNote);
      }
      lines.push('<p class="incident-meta-line"><strong>Follow-up:</strong> ' + escapeHtml(followUpParts.join(" • ")) + "</p>");
    }

    if (!lines.length) {
      lines.push('<p class="incident-meta-line"><strong>Follow-up:</strong> No admin reply has been added yet.</p>');
    }

    return lines.join("");
  }

  function buildIncidentAdminControls(incident) {
    return [
      '<div class="incident-follow-up-form section-divider">',
      "<h4>Admin response and follow-up</h4>",
      '<div class="inline-fields">',
      '<label>Status<select id="incident-status-' + escapeHtml(String(incident.id)) + '">',
      '<option value="new"' + (incident.adminStatus === "new" ? " selected" : "") + '>New</option>',
      '<option value="seen"' + (incident.adminStatus === "seen" ? " selected" : "") + '>Seen</option>',
      '<option value="noted"' + (incident.adminStatus === "noted" ? " selected" : "") + '>Noted</option>',
      '<option value="follow_up"' + (incident.adminStatus === "follow_up" ? " selected" : "") + '>Follow-up Planned</option>',
      '<option value="closed"' + (incident.adminStatus === "closed" ? " selected" : "") + '>Closed</option>',
      "</select></label>",
      '<label>Follow-up date<input id="incident-follow-up-date-' + escapeHtml(String(incident.id)) + '" type="date" value="' + escapeHtml(incident.followUpDate || "") + '"></label>',
      "</div>",
      '<label>Reply to coach<textarea id="incident-response-' + escapeHtml(String(incident.id)) + '" rows="3" placeholder="This has been seen and noted. We reviewed the incident and documented next steps.">' + escapeHtml(incident.adminResponse || "") + "</textarea></label>",
      '<label>Follow-up note<textarea id="incident-follow-up-note-' + escapeHtml(String(incident.id)) + '" rows="3" placeholder="Document the next action, who owns it, and what follow-up is needed.">' + escapeHtml(incident.followUpNote || "") + "</textarea></label>",
      '<div class="inline-actions incident-actions">',
      '<button type="button" class="ghost-btn" data-action="mark-incident-seen" data-id="' + escapeHtml(String(incident.id)) + '">Mark Seen</button>',
      '<button type="button" class="primary-btn" data-action="save-incident-follow-up" data-id="' + escapeHtml(String(incident.id)) + '">Save Follow-Up</button>',
      "</div>",
      "</div>"
    ].join("");
  }

  function renderReportSection() {
    if (!state.user) {
      return;
    }

    var schoolId = parseInt(els.reportSchoolSelect.value, 10) || firstId(state.data.schools);
    var gradeId = parseInt(els.reportGradeSelect.value, 10) || firstId(state.data.grades);
    var summary = buildGradeSummary(schoolId, gradeId);

    if (!summary) {
      els.reportSummary.innerHTML = '<div class="empty-state">Pick a school and grade with saved data to see a report.</div>';
      els.schoolSkillChart.innerHTML = "";
      renderBenchmarkFeed();
      return;
    }

    els.reportSummary.innerHTML = [
      "<h3>" + escapeHtml(summary.school.name) + " • " + escapeHtml(summary.grade.name) + "</h3>",
      "<p><strong>" + escapeHtml(String(summary.sessionCount)) + "</strong> class sessions recorded. Latest entry: <strong>" + escapeHtml(formatLongDate(summary.latestDate)) + "</strong>.</p>",
      "<p>" + escapeHtml(summary.strengthMessage) + "</p>",
      "<p>" + escapeHtml(summary.attentionMessage) + "</p>"
    ].join("");

    renderSkillChart(els.schoolSkillChart, summary.skillSnapshots, "Latest score");
    renderBenchmarkFeed();
  }

  function renderBenchmarkFeed() {
    var schoolId = parseInt(els.reportSchoolSelect.value, 10) || firstId(state.data.schools);
    var gradeId = parseInt(els.reportGradeSelect.value, 10) || firstId(state.data.grades);
    var comparisons = buildDistrictComparisons(schoolId, gradeId);

    if (!comparisons.length) {
      els.benchmarkFeed.innerHTML = '<div class="empty-state">District comparisons will appear when multiple schools have data for this grade.</div>';
      return;
    }

    var positiveCount = comparisons.filter(function (item) {
      return item.isPositive;
    }).length;
    var bestSkill = comparisons.filter(function (item) {
      return item.isPositive;
    })[0];
    var watchSkill = comparisons.filter(function (item) {
      return !item.isPositive;
    })[0];

    var cards = [
      {
        title: "District standing",
        text: positiveCount + " of " + comparisons.length + " tracked skills are ahead of district average in the latest report."
      },
      {
        title: "Best relative result",
        text: bestSkill ? bestSkill.skill.name + " is outperforming district average by " + formatChange(bestSkill.delta, bestSkill.skill.unit, true) + "." : "No clear lead is showing yet."
      },
      {
        title: "Watch next",
        text: watchSkill ? watchSkill.skill.name + " is the best place to focus next based on the latest comparison." : "No major weakness is standing out right now."
      },
      {
        title: "Suggested next move",
        text: getPracticeTip(watchSkill ? watchSkill.skill.name : bestSkill ? bestSkill.skill.name : "")
      }
    ];

    els.benchmarkFeed.innerHTML = cards.map(function (card) {
      return [
        '<div class="list-item">',
        "<h3>" + escapeHtml(card.title) + "</h3>",
        "<p>" + escapeHtml(card.text) + "</p>",
        "</div>"
      ].join("");
    }).join("");
  }

  function renderParentPortal() {
    if (!state.user || !isViewAllowed("parent", state.user.role)) {
      return;
    }

    els.parentSchoolSelect.disabled = false;
    els.parentGradeSelect.disabled = false;

    var schoolId = parseInt(els.parentSchoolSelect.value, 10) || firstId(state.data.schools);
    var gradeId = parseInt(els.parentGradeSelect.value, 10) || firstId(state.data.grades);
    var summary = buildGradeSummary(schoolId, gradeId);

    if (!summary) {
      els.parentGradeSummary.innerHTML = '<div class="empty-state">No parent-facing data exists for this grade yet.</div>';
      els.districtComparison.innerHTML = '<div class="empty-state">District comparison will appear once scores are added.</div>';
      els.parentSkillChart.innerHTML = "";
      els.progressGraphGrid.innerHTML = '<div class="empty-state">Progress graphs will appear after this grade has multiple PE entries.</div>';
      els.homePlaybook.innerHTML = '<div class="empty-state">Practice suggestions will appear after scores are entered.</div>';
      els.trendList.innerHTML = '<div class="empty-state">No trends available yet.</div>';
      els.parentComments.innerHTML = '<div class="empty-state">No coach comments have been shared yet.</div>';
      return;
    }

    els.parentGradeSummary.innerHTML = [
      "<h3>" + escapeHtml(summary.school.name) + " • " + escapeHtml(summary.grade.name) + "</h3>",
      "<p>This view is built for grade-level family communication rather than individual student records.</p>",
      "<p><strong>Latest positive trend:</strong> " + escapeHtml(summary.strengthMessage) + "</p>",
      "<p><strong>Primary focus:</strong> " + escapeHtml(summary.attentionMessage) + "</p>"
    ].join("");

    renderDistrictComparison(schoolId, gradeId);
    renderSkillChart(els.parentSkillChart, summary.skillSnapshots, "Current grade average");
    renderProgressGraphs(schoolId, gradeId);
    renderHomePlaybook(summary);
    renderTrendList(schoolId, gradeId);
    renderParentComments(schoolId, gradeId);
  }

  function renderDistrictComparison(schoolId, gradeId) {
    var school = getSchoolById(schoolId);
    var grade = getGradeById(gradeId);
    var comparisons = buildDistrictComparisons(schoolId, gradeId);

    if (!comparisons.length) {
      els.districtComparison.innerHTML = '<div class="empty-state">District comparison not available yet.</div>';
      return;
    }

    var lines = comparisons.slice(0, 4).map(function (item) {
      return item.skill.name + ": " + formatChange(item.delta, item.skill.unit, true) + " " + (item.isPositive ? "ahead of" : "behind") + " district average";
    });

    els.districtComparison.innerHTML = [
      "<h3>" + escapeHtml(school.name) + " • " + escapeHtml(grade.name) + "</h3>",
      "<p>Comparison is based on the latest saved grade entry from each school in the district.</p>",
      "<p>" + escapeHtml(lines.join(" | ")) + "</p>"
    ].join("");
  }

  function renderHomePlaybook(summary) {
    var focusSkills = summary.skillSnapshots.filter(function (snapshot) {
      return snapshot.changeDirection === "down";
    }).slice(0, 2);
    var fallbackSkills = summary.skillSnapshots.filter(function (snapshot) {
      return typeof snapshot.currentScore === "number";
    }).slice(0, 2);
    var selected = focusSkills.length ? focusSkills : fallbackSkills;

    if (!selected.length) {
      els.homePlaybook.innerHTML = '<div class="empty-state">Playbook suggestions will appear once this grade has data.</div>';
      return;
    }

    var cards = selected.map(function (snapshot) {
      return {
        title: snapshot.skill.name,
        text: getPracticeTip(snapshot.skill.name)
      };
    });

    if (summary.strengthSkill) {
      cards.push({
        title: summary.strengthSkill.name + " reinforcement",
        text: "Keep momentum going by repeating activities that support " + summary.strengthSkill.name.toLowerCase() + " once or twice a week."
      });
    }

    els.homePlaybook.innerHTML = cards.slice(0, 3).map(function (card) {
      return [
        '<div class="list-item">',
        "<h3>" + escapeHtml(card.title) + "</h3>",
        "<p>" + escapeHtml(card.text) + "</p>",
        "</div>"
      ].join("");
    }).join("");
  }

  function renderTrendList(schoolId, gradeId) {
    var sessions = getSessionsForGrade(schoolId, gradeId).slice().reverse();

    if (!sessions.length) {
      els.trendList.innerHTML = '<div class="empty-state">No trends available yet.</div>';
      return;
    }

    els.trendList.innerHTML = sessions.map(function (session, index) {
      var previous = sessions[index - 1];
      var changeText = previous ? summarizeSessionChange(previous, session) : "Baseline data capture for this grade.";
      return [
        '<div class="trend-card">',
        "<h3>" + escapeHtml(formatLongDate(session.date)) + "</h3>",
        "<p>" + escapeHtml(session.coachNote || "No coach note added.") + "</p>",
        "<p>" + escapeHtml(changeText) + "</p>",
        "</div>"
      ].join("");
    }).join("");
  }

  function renderParentComments(schoolId, gradeId) {
    var comments = state.data.comments.filter(function (comment) {
      return comment.schoolId === schoolId && comment.gradeId === gradeId;
    });

    if (!comments.length) {
      els.parentComments.innerHTML = '<div class="empty-state">No grade comments have been shared for families yet.</div>';
      return;
    }

    els.parentComments.innerHTML = comments.map(function (comment) {
      return [
        '<div class="comment-card">',
        '<div class="comment-top">',
        "<div>",
        '<span class="pill">' + escapeHtml(formatLongDate(comment.date)) + "</span>",
        "<h3>" + escapeHtml(comment.title) + "</h3>",
        "</div>",
        "</div>",
        "<p>" + escapeHtml(comment.body) + "</p>",
        "<p><strong>What to try at home:</strong> " + escapeHtml(comment.homeFocus) + "</p>",
        "</div>"
      ].join("");
    }).join("");
  }

  function renderSkillChart(target, snapshots, label) {
    var scored = snapshots.filter(function (snapshot) {
      return typeof snapshot.currentScore === "number";
    });

    if (!scored.length) {
      target.innerHTML = '<div class="empty-state">No skill data available yet.</div>';
      return;
    }

    var maxValue = 1;
    scored.forEach(function (snapshot) {
      var value = normalizeForChart(snapshot);
      if (value > maxValue) {
        maxValue = value;
      }
    });

    target.innerHTML = scored.map(function (snapshot) {
      var width = Math.max((normalizeForChart(snapshot) / maxValue) * 100, 6);
      var pillClass = snapshot.changeDirection === "down" ? "pill danger-pill" : "pill";
      return [
        '<div class="chart-row">',
        '<div class="chart-meta">',
        "<div>",
        "<strong>" + escapeHtml(snapshot.skill.name) + "</strong>",
        "<p>" + escapeHtml(label) + ": " + escapeHtml(formatScore(snapshot.currentScore, snapshot.skill.unit)) + "</p>",
        "</div>",
        '<span class="' + pillClass + '">' + escapeHtml(getChangeLabel(snapshot)) + "</span>",
        "</div>",
        '<div class="chart-track"><div class="chart-fill" style="width:' + width + '%"></div></div>',
        "</div>"
      ].join("");
    }).join("");
  }

  function renderProgressGraphs(schoolId, gradeId) {
    var histories = buildSkillHistories(schoolId, gradeId);

    if (!histories.length) {
      els.progressGraphGrid.innerHTML = '<div class="empty-state">Progress graphs will appear once this grade has saved scores.</div>';
      return;
    }

    els.progressGraphGrid.innerHTML = histories.map(function (history) {
      var pointCount = history.points.length;
      var deltaText = history.delta === null
        ? "Baseline captured. Add another class entry to show movement over time."
        : describeHistoryDelta(history);

      return [
        '<article class="progress-card">',
        '<div class="chart-meta">',
        "<div>",
        "<strong>" + escapeHtml(history.skill.name) + "</strong>",
        "<p>" + escapeHtml(pointCount) + " saved class entr" + (pointCount === 1 ? "y" : "ies") + "</p>",
        "</div>",
        '<span class="pill">' + escapeHtml(formatScore(history.latest.score, history.skill.unit)) + "</span>",
        "</div>",
        '<div class="sparkline-wrap">' + buildSparklineSvg(history) + "</div>",
        '<div class="sparkline-labels"><span>' + escapeHtml(formatShortDate(history.first.date)) + '</span><span>' + escapeHtml(formatShortDate(history.latest.date)) + "</span></div>",
        '<div class="sparkline-summary">',
        "<p><strong>Start:</strong> " + escapeHtml(formatScore(history.first.score, history.skill.unit)) + " | <strong>Latest:</strong> " + escapeHtml(formatScore(history.latest.score, history.skill.unit)) + "</p>",
        "<p>" + escapeHtml(deltaText) + "</p>",
        "</div>",
        "</article>"
      ].join("");
    }).join("");
  }

  function getChangeLabel(snapshot) {
    if (snapshot.change === null) {
      return "Baseline";
    }
    if (snapshot.changeDirection === "flat") {
      return "Stable";
    }
    return (snapshot.changeDirection === "up" ? "Improving" : "Needs attention") + " • " + snapshot.changeText;
  }

  function handleActionClick(event) {
    var target = event.target;
    var button = target.closest ? target.closest("[data-action]") : null;

    if (!button) {
      return;
    }

    var action = button.getAttribute("data-action");

    if (action === "nav-view") {
      var nextView = button.getAttribute("data-view-target");
      if (!nextView || !isViewAllowed(nextView, state.user ? state.user.role : "")) {
        return;
      }
      state.currentView = nextView;
      renderAppShell();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (action === "mark-alert-seen") {
      var incidentId = button.getAttribute("data-incident-id");
      if (!incidentId) {
        return;
      }
      saveIncidentFollowUp(incidentId, { status: "seen" }, "Incident marked as seen.");
    } else if (action === "mark-incident-seen") {
      var incidentIdSeen = button.getAttribute("data-id");
      if (!incidentIdSeen) {
        return;
      }
      saveIncidentFollowUp(incidentIdSeen, collectIncidentFollowUpPayload(incidentIdSeen, "seen"), "Incident marked as seen.");
    } else if (action === "save-incident-follow-up") {
      var incidentIdFollowUp = button.getAttribute("data-id");
      if (!incidentIdFollowUp) {
        return;
      }
      saveIncidentFollowUp(incidentIdFollowUp, collectIncidentFollowUpPayload(incidentIdFollowUp), "Incident follow-up saved.");
    } else if (action === "delete-school") {
      var id = button.getAttribute("data-id");
      if (!id) {
        return;
      }
      deleteRecord("school", id, "/api/schools/" + id, "School removed.");
    } else if (action === "delete-grade") {
      id = button.getAttribute("data-id");
      if (!id) {
        return;
      }
      deleteRecord("grade", id, "/api/grades/" + id, "Grade removed.");
    } else if (action === "edit-skill") {
      id = button.getAttribute("data-id");
      if (!id) {
        return;
      }
      beginSkillEdit(id);
    } else if (action === "delete-skill") {
      id = button.getAttribute("data-id");
      if (!id) {
        return;
      }
      deleteRecord("skill", id, "/api/skills/" + id, "Skill removed.");
    } else if (action === "delete-user") {
      id = button.getAttribute("data-id");
      if (!id) {
        return;
      }
      deleteRecord("login", id, "/api/users/" + id, "Login removed.");
    } else if (action === "resend-user-verification") {
      resendUserVerification(button.getAttribute("data-email"));
    } else if (action === "delete-session") {
      id = button.getAttribute("data-id");
      if (!id) {
        return;
      }
      deleteRecord("session", id, "/api/sessions/" + id, "PE session removed.");
    } else if (action === "delete-comment") {
      id = button.getAttribute("data-id");
      if (!id) {
        return;
      }
      deleteRecord("program update", id, "/api/comments/" + id, "Program update removed.");
    } else if (action === "delete-eod-report") {
      id = button.getAttribute("data-id");
      if (!id) {
        return;
      }
      deleteRecord("end-of-day report", id, "/api/eod-reports/" + id, "End-of-day report removed.");
    } else if (action === "dismiss-alert") {
      id = button.getAttribute("data-id");
      if (!id) {
        return;
      }
      apiRequest("POST", "/api/alerts/dismiss/" + id)
        .then(function () {
          showStatus("Alert dismissed.", "success");
          return loadBootstrap();
        })
        .catch(function (error) {
          showStatus(error.message || "Unable to dismiss that alert.", "error");
        });
    }
  }

  function deleteRecord(label, id, endpoint, successMessage) {
    var confirmed = window.confirm("Delete this " + label + "?");
    if (!confirmed) {
      return;
    }

      apiRequest("DELETE", endpoint)
      .then(function () {
        showStatus(successMessage, "success");
        return loadBootstrap();
      })
      .catch(function (error) {
        showStatus(error.message || "Unable to delete that item.", "error");
      });
  }

  function collectIncidentFollowUpPayload(incidentId, forcedStatus) {
    var statusField = document.getElementById("incident-status-" + incidentId);
    var responseField = document.getElementById("incident-response-" + incidentId);
    var followUpNoteField = document.getElementById("incident-follow-up-note-" + incidentId);
    var followUpDateField = document.getElementById("incident-follow-up-date-" + incidentId);

    return {
      status: forcedStatus || (statusField ? statusField.value : "noted"),
      adminResponse: responseField ? responseField.value.trim() : "",
      followUpNote: followUpNoteField ? followUpNoteField.value.trim() : "",
      followUpDate: followUpDateField ? followUpDateField.value : ""
    };
  }

  function saveIncidentFollowUp(incidentId, payload, successMessage) {
    apiRequest("POST", "/api/incidents/" + incidentId + "/follow-up", payload)
      .then(function () {
        showStatus(successMessage, "success");
        return loadBootstrap();
      })
      .catch(function (error) {
        showStatus(error.message || "Unable to save that incident follow-up.", "error");
      });
  }

  function handleSetupSubmit(event) {
    event.preventDefault();
    clearSetupError();

    apiRequest("POST", "/api/setup-admin", {
      username: els.setupUsername.value.trim(),
      name: els.setupName.value.trim(),
      email: els.setupEmail.value.trim(),
      password: els.setupPassword.value
    })
      .then(function (response) {
        state.user = response.user;
        state.needsSetup = false;
        state.currentView = defaultViewForRole(response.user.role);
        els.setupForm.reset();
        showStatus("Your admin account is ready.", "success");
        return loadBootstrap();
      })
      .catch(function (error) {
        showSetupError(error.message || "Unable to create the admin account.");
      });
  }

  function handleLoginSubmit(event) {
    event.preventDefault();
    clearLoginError();

    var payload = {
      audience: state.authMode,
      identifier: els.loginIdentifier.value,
      password: els.loginPassword.value
    };

    apiRequest("POST", "/api/login", payload)
      .then(function (response) {
        state.user = response.user;
        state.authMode = response.user.role === "coach" ? "coach" : "admin";
        state.currentView = defaultViewForRole(response.user.role);
        state.authStage = "form";
        showStatus("Welcome to Ufit Motion.", "success");
        return loadBootstrap();
      })
      .catch(function (error) {
        if (error.payload && error.payload.requiresVerification) {
          openVerificationFlow(error.payload.email, error.payload.deliveryMessage, error.payload.previewCode, "login");
          return;
        }
        showLoginError(error.message || "Unable to sign in.");
      });
  }

  function handleRegisterSubmit(event) {
    event.preventDefault();
    clearRegisterError();

    var role = state.authMode === "coach" ? "coach" : "admin";

    if (role === "coach" && !els.registerStaffSchool.value) {
      showRegisterError("Please choose a school for the coach account.");
      return;
    }

    apiRequest("POST", "/api/register", {
      audience: state.authMode,
      role: role,
      username: els.registerUsername.value.trim(),
      name: els.registerName.value.trim(),
      email: els.registerEmail.value.trim(),
      password: els.registerPassword.value,
      schoolId: role === "coach" ? parseInt(els.registerStaffSchool.value, 10) : null
    })
      .then(function (response) {
        els.registerForm.reset();
        openVerificationFlow(response.email, response.deliveryMessage, response.previewCode, "register");
        showStatus("Your account was created. Verify the email to finish signing in.", "success");
        return null;
      })
      .catch(function (error) {
        showRegisterError(error.message || "Unable to create that account.");
      });
  }

  function handleVerifySubmit(event) {
    event.preventDefault();
    clearVerifyError();

    apiRequest("POST", "/api/verify-email", {
      email: els.verifyEmail.value.trim(),
      code: els.verifyCode.value.trim()
    })
      .then(function (response) {
        state.user = response.user;
        state.authMode = response.user.role === "coach" ? "coach" : "admin";
        state.currentView = defaultViewForRole(response.user.role);
        state.pendingVerificationEmail = "";
        state.pendingVerificationSource = "";
        state.authStage = "form";
        els.verifyForm.reset();
        els.verifyDelivery.textContent = "";
        showStatus("Email verified. You are now signed in.", "success");
        return loadBootstrap();
      })
      .catch(function (error) {
        showVerifyError(error.message || "Unable to verify that email.");
      });
  }

  function handleResendVerification() {
    clearVerifyError();

    apiRequest("POST", "/api/request-email-verification", {
      email: els.verifyEmail.value.trim()
    })
      .then(function (response) {
        setVerifyDelivery(response.deliveryMessage, response.previewCode);
        showStatus("A fresh verification code is ready.", "success");
      })
      .catch(function (error) {
        showVerifyError(error.message || "Unable to resend the verification code.");
      });
  }

  function handleVerifyBack() {
    var returnAction = getVerificationReturnAction();
    var verificationEmail = els.verifyEmail.value.trim();
    state.pendingVerificationEmail = "";
    state.pendingVerificationSource = "";
    state.authStage = "form";
    switchAuthAction(returnAction);

    if (returnAction === "login") {
      els.loginIdentifier.value = verificationEmail;
    } else {
      els.registerEmail.value = verificationEmail;
    }
  }

  function handleExportDownload() {
    if (!state.user || state.user.role !== "admin") {
      showStatus("Only admin accounts can export the app package.", "info");
      return;
    }

    showStatus("Your app package download should begin in a moment.", "success");
    window.location.href = "/download/export";
  }

  function handleLogout() {
    exitToLoginScreen();
  }

  function handleSwitchAccount() {
    exitToLoginScreen();
  }

  function exitToLoginScreen() {
    apiRequest("POST", "/api/logout")
      .then(function () {
        resetToLoggedOutState();
        return apiRequest("GET", "/api/session");
      })
      .then(function (payload) {
        state.needsSetup = !!payload.needsSetup;
        if (state.needsSetup) {
          renderAll();
          focusPrimaryAuthField();
          return;
        }
        return loadPublicOptions().then(function () {
          renderAll();
          focusPrimaryAuthField();
        });
      })
      .catch(function (error) {
        showStatus(error.message || "Unable to return to sign-in.", "error");
      });
  }

  function resetToLoggedOutState() {
    state.user = null;
    state.authMode = "admin";
    state.authAction = "login";
    state.authStage = "landing";
    state.currentView = "overview";
    state.editingSkillId = null;
    state.pendingVerificationEmail = "";
    state.pendingVerificationSource = "";
    state.selectedAdminSchoolId = "";
    state.lastSavedCoachPerformance = null;
    state.data = emptyData();
    state.needsSetup = false;
    clearLoginError();
    clearSetupError();
    clearRegisterError();
    clearVerifyError();
    els.loginForm.reset();
    els.setupForm.reset();
    els.registerForm.reset();
    els.verifyForm.reset();
    els.verifyDelivery.textContent = "";
    resetSkillForm();
    clearOcrPreview();
    clearOcrError();
    resetOcrCapture();
    goToLoginUrl();
  }

  function goToLoginUrl() {
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, "/?welcome=1");
    }
  }

  function focusPrimaryAuthField() {
    window.setTimeout(function () {
      if (state.needsSetup && els.setupUsername) {
        els.setupUsername.focus();
        return;
      }
      if (state.authStage === "landing") {
        if (els.entryAdminBtn) {
          els.entryAdminBtn.focus();
        }
        return;
      }
      if (els.loginIdentifier) {
        els.loginIdentifier.focus();
        return;
      }
    }, 50);
  }

  function handleSchoolSubmit(event) {
    event.preventDefault();
    apiRequest("POST", "/api/schools", {
      name: document.getElementById("school-name").value.trim(),
      district: document.getElementById("school-district").value.trim()
    })
      .then(function () {
        els.schoolForm.reset();
        showStatus("School added.", "success");
        return loadBootstrap();
      })
      .catch(function (error) {
        showStatus(error.message || "Unable to add school.", "error");
      });
  }

  function handleGradeSubmit(event) {
    event.preventDefault();
    apiRequest("POST", "/api/grades", {
      name: document.getElementById("grade-name").value.trim(),
      order: parseInt(document.getElementById("grade-order").value, 10)
    })
      .then(function () {
        els.gradeForm.reset();
        showStatus("Grade added.", "success");
        return loadBootstrap();
      })
      .catch(function (error) {
        showStatus(error.message || "Unable to add grade.", "error");
      });
  }

  function handleSkillSubmit(event) {
    event.preventDefault();
    var isEditing = Boolean(state.editingSkillId);
    var payload = {
      name: els.skillName.value.trim(),
      abbreviation: els.skillAbbreviation.value.trim(),
      unit: resolveSkillUnitValue(),
      betterDirection: els.skillDirection.value
    };
    var method = isEditing ? "PATCH" : "POST";
    var endpoint = isEditing ? "/api/skills/" + state.editingSkillId : "/api/skills";

    apiRequest(method, endpoint, payload)
      .then(function () {
        resetSkillForm();
        showStatus(isEditing ? "Skill updated." : "Skill added.", "success");
        return loadBootstrap();
      })
      .catch(function (error) {
        showStatus(error.message || "Unable to save that skill.", "error");
      });
  }

  function handleUserSubmit(event) {
    event.preventDefault();
    var role = document.getElementById("user-role").value;
    apiRequest("POST", "/api/users", {
      role: role,
      username: els.userUsername.value.trim(),
      name: document.getElementById("user-name").value.trim(),
      email: document.getElementById("user-email").value.trim(),
      password: document.getElementById("user-password").value.trim(),
      schoolId: role === "coach" ? parseInt(els.userSchool.value, 10) : null
    })
      .then(function (response) {
        els.userForm.reset();
        els.userRole.value = "coach";
        toggleUserAccessFields();
        showStatus(buildVerificationStatusMessage("Login created. Verification is now required before first sign-in.", response.deliveryMessage, response.previewCode), "success");
        return loadBootstrap();
      })
      .catch(function (error) {
        showStatus(error.message || "Unable to create that login.", "error");
      });
  }

  function handleSessionSubmit(event) {
    event.preventDefault();
    if (!els.sessionSchool.value || !els.sessionGrade.value || !els.sessionDate.value) {
      showStatus("Please choose a school, grade, and date before saving the class.", "error");
      return;
    }
    if (!els.sessionEngagement.value) {
      showStatus("Please choose an engagement rating before saving the class.", "error");
      return;
    }

    var invalidSkillName = "";
    var results = state.data.skills.map(function (skill) {
      var input = els.sessionForm.querySelector('[name="score-' + String(skill.id) + '"]');
      var value = input ? input.value : "";
      var parsedScore = parseSkillScoreInput(value);
      if (value !== "" && (typeof parsedScore !== "number" || isNaN(parsedScore))) {
        invalidSkillName = skill.name;
      }
      return {
        skillId: skill.id,
        score: parsedScore
      };
    }).filter(function (result) {
      return typeof result.score === "number" && !isNaN(result.score);
    });

    if (invalidSkillName) {
      showStatus("Please enter a valid number for " + invalidSkillName + ". Use up to 4 whole digits and 4 decimals.", "error");
      return;
    }
    if (!results.length) {
      showStatus("Enter at least one skill score before saving the class.", "error");
      return;
    }

    apiRequest("POST", "/api/sessions", {
      schoolId: parseInt(els.sessionSchool.value, 10),
      gradeId: parseInt(els.sessionGrade.value, 10),
      date: els.sessionDate.value,
      coachNote: document.getElementById("session-coach").value.trim(),
      engagementRating: els.sessionEngagement.value ? parseFloat(els.sessionEngagement.value) : null,
      results: results
    })
      .then(function (response) {
        state.lastSavedCoachPerformance = response.coachPerformance || null;
        els.sessionForm.reset();
        setDefaultDates();
        clearOcrPreview();
        clearOcrError();
        resetOcrCapture();
        return loadBootstrap().then(function () {
          var performance = response.coachPerformance;
          if (performance) {
            showStatus(
              "PE class data saved. Engagement data was updated. Submit the end-of-day report to complete the score update for admin.",
              "success"
            );
          } else {
            showStatus("PE class data saved.", "success");
          }
        });
      })
      .catch(function (error) {
        showStatus(error.message || "Unable to save class data.", "error");
      });
  }

  function handleIncidentSubmit(event) {
    event.preventDefault();

    apiRequest("POST", "/api/incidents", {
      schoolId: parseInt(els.incidentSchool.value, 10),
      date: els.incidentDate.value,
      title: els.incidentTitle.value.trim(),
      details: els.incidentDetails.value.trim()
    })
      .then(function () {
        els.incidentForm.reset();
        setDefaultDates();
        return loadBootstrap().then(function () {
          showStatus("Incident alert submitted. Admin can review it in the Incident Center, and open admin screens now refresh automatically.", "success");
        });
      })
      .catch(function (error) {
        showStatus(error.message || "Unable to submit that incident.", "error");
      });
  }

  function handleOcrSubmit(event) {
    event.preventDefault();
    clearOcrError();
    clearOcrPreview();

    var selectedFile = els.ocrImage.files && els.ocrImage.files[0] ? els.ocrImage.files[0] : null;
    var uploadBlob = state.capturedOcrBlob || selectedFile;

    if (!uploadBlob) {
      showOcrError("Please upload a score sheet photo or take one live in the app first.");
      return;
    }

    var formData = new FormData();
    formData.append("image", uploadBlob, state.capturedOcrFilename || (selectedFile ? selectedFile.name : "live-score-sheet.jpg"));

    fetch("/api/import-score-sheet", {
      method: "POST",
      credentials: "same-origin",
      body: formData
    })
      .then(function (response) {
        return response.text().then(function (text) {
          var data = {};
          if (text) {
            try {
              data = JSON.parse(text);
            } catch (error) {
              data = {};
            }
          }

          if (!response.ok) {
            var err = new Error(data.error || "Unable to read that score sheet.");
            err.payload = data;
            throw err;
          }

          return data;
        });
      })
      .then(function (response) {
        applyOcrResults(response.matches || []);
        syncSessionFromOcr();
        renderOcrPreview(response);
        showStatus("Score sheet read. Review the imported values, then save the PE session.", "success");
      })
      .catch(function (error) {
        showOcrError(error.message || "Unable to read that score sheet image.");
      });
  }

  function handleOcrFileChange() {
    stopOcrCameraStream();
    clearCapturedOcrImage();
    renderOcrCaptureUi();
  }

  function handleOpenOcrCamera() {
    clearOcrError();

    if (!canUseLiveCamera()) {
      showOcrError("Live camera capture works on localhost or HTTPS in supported browsers. Use the upload field if camera access is blocked.");
      return;
    }

    stopOcrCameraStream();
    clearCapturedOcrImage();

    navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" }
      },
      audio: false
    })
      .then(function (stream) {
        state.ocrCameraStream = stream;
        els.ocrCameraVideo.srcObject = stream;
        return els.ocrCameraVideo.play();
      })
      .then(function () {
        renderOcrCaptureUi();
        showStatus("Camera is ready. Frame the score sheet and take the photo.", "success");
      })
      .catch(function () {
        stopOcrCameraStream();
        renderOcrCaptureUi();
        showOcrError("Camera access was blocked. You can still upload an existing photo from this device.");
      });
  }

  function handleCaptureOcrPhoto() {
    if (!state.ocrCameraStream) {
      showOcrError("Open the camera first, then take the photo.");
      return;
    }

    var video = els.ocrCameraVideo;
    var canvas = els.ocrCameraCanvas;
    var width = video.videoWidth || 1600;
    var height = video.videoHeight || 1200;
    var context = canvas.getContext("2d");

    canvas.width = width;
    canvas.height = height;
    context.drawImage(video, 0, 0, width, height);

    canvas.toBlob(function (blob) {
      if (!blob) {
        showOcrError("The live photo could not be captured. Please try again.");
        return;
      }

      state.capturedOcrBlob = blob;
      state.capturedOcrFilename = "live-score-sheet-" + Date.now() + ".jpg";
      if (state.capturedOcrUrl) {
        URL.revokeObjectURL(state.capturedOcrUrl);
      }
      state.capturedOcrUrl = URL.createObjectURL(blob);
      els.ocrImage.value = "";
      stopOcrCameraStream();
      renderOcrCaptureUi();
      showStatus("Live photo captured. You can read it into the form now.", "success");
    }, "image/jpeg", 0.92);
  }

  function handleStopOcrCamera() {
    if (state.ocrCameraStream) {
      stopOcrCameraStream();
      renderOcrCaptureUi();
      return;
    }

    clearCapturedOcrImage();
    renderOcrCaptureUi();
  }

  function handleCommentSubmit(event) {
    event.preventDefault();
    apiRequest("POST", "/api/comments", {
      schoolId: parseInt(els.commentSchool.value, 10),
      gradeId: parseInt(els.commentGrade.value, 10),
      date: els.commentDate.value,
      title: document.getElementById("comment-title").value.trim(),
      body: document.getElementById("comment-body").value.trim(),
      homeFocus: document.getElementById("comment-home").value.trim()
    })
      .then(function () {
        els.commentForm.reset();
        setDefaultDates();
        showStatus("Program update saved.", "success");
        return loadBootstrap();
      })
      .catch(function (error) {
        showStatus(error.message || "Unable to save that coach update.", "error");
      });
  }

  function handleEodReportSubmit(event) {
    event.preventDefault();
    var classesCompletedValue = parseWholeNumberInput(els.eodClasses.value);
    if (!els.eodSchool.value || !els.eodDate.value) {
      showStatus("Please choose the school and report date before submitting the end-of-day report.", "error");
      return;
    }
    if (classesCompletedValue === null || isNaN(classesCompletedValue)) {
      showStatus("Please enter classes completed as a whole number.", "error");
      return;
    }
    if (!els.eodSummary.value.trim() || !els.eodCelebrations.value.trim() || !els.eodFollowUp.value.trim()) {
      showStatus("Please complete the summary, celebrations, and follow-up fields before submitting the end-of-day report.", "error");
      return;
    }

    apiRequest("POST", "/api/eod-reports", {
      schoolId: parseInt(els.eodSchool.value, 10),
      date: els.eodDate.value,
      classesCompleted: classesCompletedValue,
      summary: els.eodSummary.value.trim(),
      celebrations: els.eodCelebrations.value.trim(),
      followUpNeeded: els.eodFollowUp.value.trim(),
      supportNeeded: els.eodSupport.value.trim()
    })
      .then(function (response) {
        state.lastSavedCoachPerformance = response.coachPerformance || null;
        els.eodReportForm.reset();
        setDefaultDates();
        return loadBootstrap().then(function () {
          var performance = response.coachPerformance;
          if (performance) {
            showStatus(
              "End-of-day report submitted. Your admin score is now " + formatNumeric(performance.performanceScore, 1) + ", and admin can see the report in Reports.",
              "success"
            );
          } else {
            showStatus("End-of-day report submitted.", "success");
          }
        });
      })
      .catch(function (error) {
        showStatus(error.message || "Unable to submit that end-of-day report.", "error");
      });
  }

  function switchAuthMode(mode) {
    state.authMode = mode === "coach" ? "coach" : "admin";
    clearLoginError();
    clearSetupError();
    clearRegisterError();
    clearVerifyError();
    els.loginForm.reset();
    els.registerForm.reset();
    els.verifyForm.reset();
    state.pendingVerificationSource = "";
    if (!state.user && !state.needsSetup && state.authStage !== "landing") {
      state.authStage = "form";
    }
    if (state.authAction !== "verify") {
      els.verifyDelivery.textContent = "";
    }

    renderAuthShell();
  }

  function switchAuthAction(action) {
    state.authAction = action;
    clearLoginError();
    clearSetupError();
    clearRegisterError();
    clearVerifyError();
    els.loginForm.reset();
    els.registerForm.reset();
    if (action !== "verify") {
      els.verifyForm.reset();
      state.pendingVerificationEmail = "";
      state.pendingVerificationSource = "";
    }
    if (action !== "verify") {
      els.verifyDelivery.textContent = "";
    }
    if (!state.user && !state.needsSetup && state.authStage !== "landing") {
      state.authStage = "form";
    }

    renderAuthShell();
  }

  function populateSelects() {
    setOptions(els.reportSchoolSelect, state.data.schools);
    setOptions(els.reportGradeSelect, state.data.grades);
    setOptions(els.sessionSchool, state.data.schools);
    setOptions(els.sessionGrade, state.data.grades);
    setOptions(els.eodSchool, state.data.schools);
    setOptions(els.commentSchool, state.data.schools);
    setOptions(els.commentGrade, state.data.grades);
    setOptions(els.parentSchoolSelect, state.data.schools);
    setOptions(els.parentGradeSelect, state.data.grades);
    setOptions(els.userSchool, state.data.schools);
    setOptions(els.userGrade, state.data.grades);
    setOptions(els.registerSchool, state.data.schools);
    setOptions(els.registerGrade, state.data.grades);
    setOptions(els.registerStaffSchool, state.data.schools);
    setOptions(els.ocrSchool, state.data.schools);
    setOptions(els.ocrGrade, state.data.grades);
    setOptions(els.incidentSchool, state.data.schools);
    setAdminSchoolOptions();
    setEodCoachOptions();
  }

  function setAdminSchoolOptions() {
    if (!els.adminSchoolFilter) {
      return;
    }

    var current = state.selectedAdminSchoolId || els.adminSchoolFilter.value || "";
    var options = ['<option value="">All schools</option>'].concat(
      state.data.schools.map(function (school) {
        return '<option value="' + escapeHtml(String(school.id)) + '">' + escapeHtml(school.name) + "</option>";
      })
    );

    els.adminSchoolFilter.innerHTML = options.join("");
    els.adminSchoolFilter.value = state.data.schools.some(function (school) {
      return String(school.id) === current;
    }) ? current : "";
    state.selectedAdminSchoolId = els.adminSchoolFilter.value;
  }

  function setEodCoachOptions() {
    if (!els.eodCoachFilter) {
      return;
    }

    var current = els.eodCoachFilter.value || "";
    var selectedSchoolId = getSelectedAdminSchoolId();
    var coaches = state.data.users.filter(function (user) {
      return user.role === "coach" && (!selectedSchoolId || user.schoolId === selectedSchoolId);
    });

    var options = ['<option value="">All coaches</option>'].concat(
      coaches.map(function (coach) {
        return '<option value="' + escapeHtml(String(coach.id)) + '">' + escapeHtml(coach.name) + "</option>";
      })
    );

    els.eodCoachFilter.innerHTML = options.join("");
    var hasCurrent = coaches.some(function (coach) {
      return String(coach.id) === current;
    });
    els.eodCoachFilter.value = hasCurrent ? current : "";
  }

  function handleAdminSchoolFilterChange() {
    state.selectedAdminSchoolId = els.adminSchoolFilter.value || "";
    if (state.selectedAdminSchoolId) {
      els.reportSchoolSelect.value = state.selectedAdminSchoolId;
      if (state.user && state.user.role === "admin" && els.parentSchoolSelect) {
        els.parentSchoolSelect.value = state.selectedAdminSchoolId;
      }
    }
    syncDashboardUrl();
    renderAll();
  }

  function setOptions(select, items) {
    if (!select) {
      return;
    }

    var current = select.value;
    var html = items.map(function (item) {
      return '<option value="' + escapeHtml(String(item.id)) + '">' + escapeHtml(item.name) + "</option>";
    }).join("");

    select.innerHTML = html;

    if (!items.length) {
      select.value = "";
      return;
    }

    var hasCurrent = items.some(function (item) {
      return String(item.id) === current;
    });

    select.value = hasCurrent ? current : String(items[0].id);
  }

  function openVerificationFlow(email, deliveryMessage, previewCode, sourceAction) {
    state.pendingVerificationEmail = email || "";
    state.pendingVerificationSource = sourceAction || "login";
    state.authStage = "form";
    switchAuthAction("verify");
    els.verifyEmail.value = email || "";
    els.verifyCode.value = "";
    setVerifyDelivery(deliveryMessage, previewCode);
  }

  function setVerifyDelivery(message, previewCode) {
    els.verifyDelivery.textContent = buildVerificationStatusMessage("", message, previewCode);
  }

  function renderOcrCaptureUi() {
    var hasCameraAccess = canUseLiveCamera();
    var hasCapturedPhoto = Boolean(state.capturedOcrUrl);
    var hasLiveStream = Boolean(state.ocrCameraStream);

    els.ocrOpenCameraBtn.classList.toggle("hidden", !hasCameraAccess || hasLiveStream);
    els.ocrCaptureBtn.classList.toggle("hidden", !hasLiveStream);
    els.ocrStopCameraBtn.classList.toggle("hidden", !hasLiveStream && !hasCapturedPhoto);
    els.ocrStopCameraBtn.textContent = hasLiveStream ? "Close Camera" : "Clear Live Photo";
    els.ocrCameraPanel.classList.toggle("hidden", !hasLiveStream && !hasCapturedPhoto);
    els.ocrCameraVideo.classList.toggle("hidden", !hasLiveStream);
    els.ocrCapturedPreview.classList.toggle("hidden", !hasCapturedPhoto);

    if (state.capturedOcrUrl) {
      els.ocrCapturedPreview.src = state.capturedOcrUrl;
    } else {
      els.ocrCapturedPreview.removeAttribute("src");
    }

    els.ocrSourceHint.textContent = hasCameraAccess
      ? "Use Upload for an existing image, or Open Camera to take the score sheet photo live in the app."
      : "Live camera capture works on localhost or HTTPS. Upload still works here, and the file picker can still open the phone camera on many devices.";
  }

  function renderEmailSettings() {
    if (!els.emailSettingsDetails) {
      return;
    }
  }

  function updateSkillUnitField() {
    if (!els.skillUnit) {
      return;
    }

    var isCustom = els.skillUnit.value === "custom";
    els.skillUnitCustomWrap.classList.toggle("hidden", !isCustom);
    els.skillUnitCustom.disabled = !isCustom;
    els.skillUnitCustom.required = isCustom;

    if (!isCustom) {
      els.skillUnitCustom.value = "";
      var suggestedDirection = getSuggestedDirection(els.skillUnit.value);
      if (suggestedDirection) {
        els.skillDirection.value = suggestedDirection;
      }
    }
  }

  function resolveSkillUnitValue() {
    if (els.skillUnit.value !== "custom") {
      return els.skillUnit.value;
    }
    return els.skillUnitCustom.value.trim();
  }

  function beginSkillEdit(skillId) {
    var skill = getSkillById(parseInt(skillId, 10));
    if (!skill || !skill.id) {
      return;
    }

    state.editingSkillId = skill.id;
    els.skillEditId.value = String(skill.id);
    els.skillName.value = skill.name;
    els.skillAbbreviation.value = skill.abbreviation || "";
    if (unitPresets[String(skill.unit || "").toLowerCase()]) {
      els.skillUnit.value = skill.unit;
      els.skillUnitCustom.value = "";
    } else {
      els.skillUnit.value = "custom";
      els.skillUnitCustom.value = skill.unit;
    }
    els.skillDirection.value = skill.betterDirection;
    els.skillSubmitBtn.textContent = "Save Skill";
    els.skillCancelBtn.classList.remove("hidden");
    updateSkillUnitField();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetSkillForm() {
    state.editingSkillId = null;
    els.skillEditId.value = "";
    els.skillForm.reset();
    els.skillSubmitBtn.textContent = "Add Skill";
    els.skillCancelBtn.classList.add("hidden");
    updateSkillUnitField();
  }

  function applyOcrResults(matches) {
    matches.forEach(function (match) {
      var input = els.sessionForm.querySelector('[name="score-' + String(match.skillId) + '"]');
      if (input) {
        input.value = Number(match.value).toFixed(4).replace(/\.?0+$/, "");
      }
    });
  }

  function syncSessionFromOcr() {
    els.sessionSchool.value = els.ocrSchool.value;
    els.sessionGrade.value = els.ocrGrade.value;
    els.sessionDate.value = els.ocrDate.value;
    els.sessionCoach.value = els.ocrNote.value;
  }

  function renderOcrPreview(payload) {
    var matches = payload.matches || [];
    var unmatched = payload.unmatchedLines || [];
    var blocks = [];

    if (matches.length) {
      blocks.push(matches.map(function (match) {
        return [
          '<div class="list-item">',
          "<h3>" + escapeHtml(match.skillName) + " (" + escapeHtml(match.abbreviation || "No abbr") + ")</h3>",
          "<p>Imported value: " + escapeHtml(formatNumeric(match.value, 4)) + "</p>",
          "<p>Source line: " + escapeHtml(match.sourceLine) + "</p>",
          "</div>"
        ].join("");
      }).join(""));
    }

    if (unmatched.length) {
      blocks.push(
        [
          '<div class="list-item">',
          "<h3>Lines to review manually</h3>",
          "<p>" + escapeHtml(unmatched.join(" | ")) + "</p>",
          "</div>"
        ].join("")
      );
    }

    if (payload.recognizedText) {
      blocks.push(
        [
          '<div class="list-item">',
          "<h3>Recognized text preview</h3>",
          '<pre class="ocr-text-preview">' + escapeHtml(payload.recognizedText) + "</pre>",
          "</div>"
        ].join("")
      );
    }

    els.ocrPreview.innerHTML = blocks.length
      ? blocks.join("")
      : '<div class="empty-state">No recognizable skill lines were found in that photo. Try a clearer image or shorter abbreviations.</div>';
  }

  function showOcrError(message) {
    els.ocrError.hidden = false;
    els.ocrError.textContent = message;
  }

  function clearOcrError() {
    els.ocrError.hidden = true;
    els.ocrError.textContent = "";
  }

  function clearOcrPreview() {
    els.ocrPreview.innerHTML = "";
  }

  function canUseLiveCamera() {
    return Boolean(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.isSecureContext
    );
  }

  function stopOcrCameraStream() {
    if (!state.ocrCameraStream) {
      return;
    }

    state.ocrCameraStream.getTracks().forEach(function (track) {
      track.stop();
    });
    state.ocrCameraStream = null;
    els.ocrCameraVideo.pause();
    els.ocrCameraVideo.srcObject = null;
  }

  function clearCapturedOcrImage() {
    state.capturedOcrBlob = null;
    state.capturedOcrFilename = "";
    if (state.capturedOcrUrl) {
      URL.revokeObjectURL(state.capturedOcrUrl);
    }
    state.capturedOcrUrl = "";
    els.ocrCapturedPreview.removeAttribute("src");
  }

  function resetOcrCapture() {
    stopOcrCameraStream();
    clearCapturedOcrImage();
    els.ocrImage.value = "";
    renderOcrCaptureUi();
  }

  function toggleUserAccessFields() {
    var role = els.userRole.value;
    var needsSchool = role === "coach";
    var needsGrade = false;

    els.userSchoolWrap.classList.toggle("hidden", !needsSchool);
    els.userGradeWrap.classList.toggle("hidden", !needsGrade);
    els.userSchool.disabled = !needsSchool;
    els.userGrade.disabled = !needsGrade;
  }

  function updateRegisterRoleFields() {
    if (!els.registerStaffSchoolWrap) {
      return;
    }
    var showCoachSchool = state.authMode === "coach";
    els.registerStaffSchoolWrap.classList.toggle("hidden", !showCoachSchool || state.authAction !== "register");
    if (els.registerStaffSchool) {
      els.registerStaffSchool.disabled = !showCoachSchool;
    }
  }

  function resendUserVerification(email) {
    if (!email) {
      showStatus("That account is missing an email address.", "error");
      return;
    }

    apiRequest("POST", "/api/request-email-verification", {
      email: email
    })
      .then(function (response) {
        showStatus(buildVerificationStatusMessage("Verification resent.", response.deliveryMessage, response.previewCode), "success");
        return loadBootstrap();
      })
      .catch(function (error) {
        showStatus(error.message || "Unable to resend verification.", "error");
      });
  }

  function buildVerificationStatusMessage(prefix, deliveryMessage, previewCode) {
    var parts = [];
    if (prefix) {
      parts.push(prefix);
    }
    if (deliveryMessage) {
      parts.push(deliveryMessage);
    }
    if (previewCode) {
      parts.push("Verification code: " + previewCode);
    }
    return parts.join(" ");
  }

  function getVerificationReturnAction() {
    return state.pendingVerificationSource === "register" ? "register" : "login";
  }

  function openPortalEntry(mode) {
    state.authMode = mode === "coach" ? "coach" : "admin";
    state.authAction = "login";
    state.authStage = "form";
    clearLoginError();
    clearRegisterError();
    clearVerifyError();
    els.loginForm.reset();
    els.registerForm.reset();
    els.verifyForm.reset();
    els.verifyDelivery.textContent = "";
    renderAuthShell();
  }

  function handleAuthHome() {
    state.authStage = "landing";
    state.authAction = "login";
    state.pendingVerificationEmail = "";
    state.pendingVerificationSource = "";
    clearLoginError();
    clearRegisterError();
    clearVerifyError();
    els.loginForm.reset();
    els.registerForm.reset();
    els.verifyForm.reset();
    els.verifyDelivery.textContent = "";
    renderAuthShell();
  }

  function shouldForceWelcomeScreen() {
    return new URLSearchParams(window.location.search).get("welcome") === "1";
  }

  function clearWelcomeSearchParam() {
    if (!shouldForceWelcomeScreen()) {
      return;
    }
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, "/");
    }
  }

  function hydrateDashboardStateFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var schoolId = params.get("school_id");
    var view = params.get("view");
    if (schoolId) {
      state.selectedAdminSchoolId = schoolId;
    }
    if (view) {
      state.currentView = view;
    }
  }

  function syncDashboardUrl() {
    if (!(window.history && window.history.replaceState)) {
      return;
    }
    var basePath = state.user && state.user.role === "admin" ? "/admin/dashboard" : "/coach/dashboard";
    if (shouldForceWelcomeScreen()) {
      basePath = "/";
    }
    var next = basePath;
    var params = [];
    if (state.selectedAdminSchoolId) {
      params.push("school_id=" + encodeURIComponent(state.selectedAdminSchoolId));
    }
    if (state.currentView && state.currentView !== defaultViewForRole(state.user ? state.user.role : "")) {
      params.push("view=" + encodeURIComponent(state.currentView));
    }
    if (params.length) {
      next += "?" + params.join("&");
    }
    window.history.replaceState({}, document.title, next);
  }

  function showLoginError(message) {
    els.loginError.hidden = false;
    els.loginError.textContent = message;
  }

  function showSetupError(message) {
    els.setupError.hidden = false;
    els.setupError.textContent = message;
  }

  function showRegisterError(message) {
    els.registerError.hidden = false;
    els.registerError.textContent = message;
  }

  function showVerifyError(message) {
    els.verifyError.hidden = false;
    els.verifyError.textContent = message;
  }

  function clearLoginError() {
    els.loginError.hidden = true;
    els.loginError.textContent = "";
  }

  function clearSetupError() {
    els.setupError.hidden = true;
    els.setupError.textContent = "";
  }

  function clearRegisterError() {
    els.registerError.hidden = true;
    els.registerError.textContent = "";
  }

  function clearVerifyError() {
    els.verifyError.hidden = true;
    els.verifyError.textContent = "";
  }

  function showStatus(message, kind) {
    if (!els.statusBanner) {
      return;
    }

    els.statusBanner.textContent = message;
    els.statusBanner.className = "status-banner";
    els.statusBanner.classList.add("status-" + (kind || "info"));
    els.statusBanner.classList.remove("hidden");

    if (statusTimer) {
      window.clearTimeout(statusTimer);
    }

    statusTimer = window.setTimeout(function () {
      els.statusBanner.classList.add("hidden");
    }, 4000);
  }

  function emptyData() {
    return {
      schools: [],
      grades: [],
      skills: [],
      sessions: [],
      eodReports: [],
      comments: [],
      users: [],
      incidents: [],
      alerts: [],
      performanceRows: [],
      coachPerformance: null,
      engagementSummary: null,
      selectedSchoolId: ""
    };
  }

  function emptyEmailSettings() {
    return {
      configured: false,
      source: "none",
      host: "",
      port: 587,
      security: "starttls",
      username: "",
      fromEmail: "",
      suggestedFromEmail: "",
      hasPassword: false
    };
  }

  function mergeEmailSettings(settings) {
    var defaults = emptyEmailSettings();
    var merged = {};
    Object.keys(defaults).forEach(function (key) {
      merged[key] = settings && settings[key] !== undefined ? settings[key] : defaults[key];
    });
    return merged;
  }

  function collectEmailSettingsPayload() {
    return {
      host: els.smtpHost.value.trim(),
      port: parseInt(els.smtpPort.value, 10),
      security: els.smtpSecurity.value,
      fromEmail: els.smtpFromEmail.value.trim(),
      username: els.smtpUsername.value.trim(),
      password: els.smtpPassword.value
    };
  }

  function saveEmailSettings() {
    return apiRequest("POST", "/api/email-settings", collectEmailSettingsPayload())
      .then(function (response) {
        state.emailSettings = mergeEmailSettings(response.settings || {});
        return response;
      });
  }

  function showEmailSettingsError(message) {
    els.emailSettingsError.hidden = false;
    els.emailSettingsError.textContent = message;
  }

  function clearEmailSettingsError() {
    els.emailSettingsError.hidden = true;
    els.emailSettingsError.textContent = "";
  }

  function setEmailSettingsStatus(message) {
    els.emailSettingsStatus.textContent = message || "";
  }

  function sortCollections() {
    state.data.schools.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
    state.data.grades.sort(function (a, b) {
      return a.order - b.order;
    });
    state.data.skills.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
    state.data.sessions.sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    });
    state.data.eodReports.sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    });
    state.data.comments.sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    });
    state.data.incidents.sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    });
    state.data.alerts.sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    state.data.performanceRows.sort(function (a, b) {
      return b.performanceScore - a.performanceScore;
    });
    state.data.users.sort(function (a, b) {
      var order = { admin: 1, coach: 2 };
      var roleDiff = (order[a.role] || 10) - (order[b.role] || 10);
      return roleDiff || a.name.localeCompare(b.name);
    });
  }

  function buildGradeSummary(schoolId, gradeId) {
    var sessions = getSessionsForGrade(schoolId, gradeId);
    if (!sessions.length) {
      return null;
    }

    var latest = sessions[0];
    var previous = sessions.length > 1 ? sessions[1] : null;
    var snapshots = state.data.skills.map(function (skill) {
      var currentResult = findResult(latest.results, skill.id);
      var previousResult = previous ? findResult(previous.results, skill.id) : null;
      var currentScore = currentResult ? currentResult.score : null;
      var previousScore = previousResult ? previousResult.score : null;
      var change = currentScore !== null && previousScore !== null ? currentScore - previousScore : null;
      var improved = change !== null ? (skill.betterDirection === "lower" ? change < 0 : change > 0) : null;
      var direction = change === null ? "flat" : change === 0 ? "flat" : improved ? "up" : "down";

      return {
        skill: skill,
        currentScore: currentScore,
        previousScore: previousScore,
        change: change,
        changeDirection: direction,
        changeText: change === null ? "No prior score" : formatChange(change, skill.unit, true)
      };
    });

    var strengths = snapshots.filter(function (item) {
      return item.changeDirection === "up";
    });
    var attention = snapshots.filter(function (item) {
      return item.changeDirection === "down";
    });
    var strengthSkill = strengths.length ? strengths[0].skill : null;
    var attentionSkill = attention.length ? attention[0].skill : null;

    return {
      school: getSchoolById(schoolId),
      grade: getGradeById(gradeId),
      latestDate: latest.date,
      sessionCount: sessions.length,
      skillSnapshots: snapshots,
      strengthSkill: strengthSkill,
      attentionSkill: attentionSkill,
      strengthMessage: strengthSkill
        ? strengthSkill.name + " is trending in the right direction, and " + strengths.length + " tracked area" + (strengths.length === 1 ? "" : "s") + " improved since the last class."
        : "This grade has baseline data recorded and will show stronger trend language after the next PE entry.",
      attentionMessage: attentionSkill
        ? attentionSkill.name + " is the clearest next area to reinforce after the latest session."
        : "No major regression is showing in the latest session."
    };
  }

  function buildDistrictComparisons(schoolId, gradeId) {
    var selectedSessions = getSessionsForGrade(schoolId, gradeId);
    if (!selectedSessions.length) {
      return [];
    }

    var latestBySchool = state.data.schools.map(function (school) {
      return getSessionsForGrade(school.id, gradeId)[0];
    }).filter(function (item) {
      return Boolean(item);
    });

    if (latestBySchool.length < 2) {
      return [];
    }

    var selectedLatest = selectedSessions[0];
    return state.data.skills.map(function (skill) {
      var districtScores = latestBySchool.map(function (session) {
        var result = findResult(session.results, skill.id);
        return result ? result.score : null;
      }).filter(function (score) {
        return typeof score === "number";
      });

      var selectedResult = findResult(selectedLatest.results, skill.id);
      if (!selectedResult || !districtScores.length) {
        return null;
      }

      var districtAverage = average(districtScores);
      var delta = selectedResult.score - districtAverage;
      return {
        skill: skill,
        districtAverage: districtAverage,
        selectedScore: selectedResult.score,
        delta: delta,
        isPositive: skill.betterDirection === "lower" ? delta < 0 : delta > 0
      };
    }).filter(function (item) {
      return Boolean(item);
    }).sort(function (a, b) {
      return Math.abs(b.delta) - Math.abs(a.delta);
    });
  }

  function summarizeSessionChange(previous, current) {
    var ranked = current.results.map(function (result) {
      var prior = findResult(previous.results, result.skillId);
      var skill = getSkillById(result.skillId);
      if (!prior || !skill) {
        return null;
      }
      var delta = result.score - prior.score;
      return {
        skill: skill,
        delta: delta,
        improved: skill.betterDirection === "lower" ? delta < 0 : delta > 0
      };
    }).filter(function (item) {
      return Boolean(item);
    }).sort(function (a, b) {
      return Math.abs(b.delta) - Math.abs(a.delta);
    });

    if (!ranked.length) {
      return "No change data available.";
    }

    var top = ranked[0];
    if (top.improved) {
      return top.skill.name + " showed the biggest jump, changing by " + formatChange(top.delta, top.skill.unit, true) + " from the previous class.";
    }
    return top.skill.name + " shifted by " + formatChange(top.delta, top.skill.unit, true) + " and may need extra attention next class.";
  }

  function buildSkillHistories(schoolId, gradeId) {
    var sessions = getSessionsForGrade(schoolId, gradeId).slice().reverse();

    return state.data.skills.map(function (skill) {
      var points = sessions.map(function (session) {
        var result = findResult(session.results, skill.id);
        if (!result) {
          return null;
        }
        return {
          date: session.date,
          score: result.score,
          trendValue: skill.betterDirection === "lower" ? 0 - result.score : result.score
        };
      }).filter(function (point) {
        return Boolean(point);
      });

      if (!points.length) {
        return null;
      }

      var first = points[0];
      var latest = points[points.length - 1];
      var delta = points.length > 1 ? latest.score - first.score : null;

      return {
        skill: skill,
        points: points,
        first: first,
        latest: latest,
        delta: delta,
        improved: delta === null ? null : (skill.betterDirection === "lower" ? delta < 0 : delta > 0)
      };
    }).filter(function (item) {
      return Boolean(item);
    });
  }

  function buildSparklineSvg(history) {
    var points = history.points;
    var width = 320;
    var height = 140;
    var paddingX = 12;
    var paddingY = 12;
    var chartWidth = width - paddingX * 2;
    var chartHeight = height - paddingY * 2;
    var values = points.map(function (point) {
      return point.trendValue;
    });
    var minValue = Math.min.apply(null, values);
    var maxValue = Math.max.apply(null, values);
    var range = maxValue - minValue;

    var coordinates = points.map(function (point, index) {
      var x = paddingX + (points.length === 1 ? chartWidth / 2 : (chartWidth * index) / (points.length - 1));
      var y = range === 0
        ? paddingY + chartHeight / 2
        : paddingY + ((maxValue - point.trendValue) / range) * chartHeight;
      return {
        x: x,
        y: y
      };
    });

    var polylinePoints = coordinates.map(function (point) {
      return point.x.toFixed(1) + "," + point.y.toFixed(1);
    }).join(" ");

    var gridLines = [paddingY, paddingY + chartHeight / 2, paddingY + chartHeight].map(function (y) {
      return '<line class="sparkline-grid-line" x1="' + paddingX + '" y1="' + y.toFixed(1) + '" x2="' + (width - paddingX) + '" y2="' + y.toFixed(1) + '"></line>';
    }).join("");

    var dots = coordinates.map(function (point, index) {
      var dotClass = index === coordinates.length - 1 ? "sparkline-dot latest" : "sparkline-dot";
      return '<circle class="' + dotClass + '" cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1) + '" r="5"></circle>';
    }).join("");

    return [
      '<svg class="sparkline" viewBox="0 0 ' + width + " " + height + '" preserveAspectRatio="none">',
      gridLines,
      '<polyline class="sparkline-path" points="' + polylinePoints + '"></polyline>',
      dots,
      "</svg>"
    ].join("");
  }

  function describeHistoryDelta(history) {
    if (history.delta === null) {
      return "Baseline captured. Add another class entry to show movement over time.";
    }

    var verb;
    if (history.skill.unit === "seconds") {
      verb = history.improved ? "faster" : "slower";
    } else if (history.skill.unit === "inches") {
      verb = history.improved ? "higher" : "lower";
    } else {
      verb = history.improved ? "better" : "lower";
    }

    return "Since the first class entry, this grade is " + formatChange(history.delta, history.skill.unit, true) + " " + verb + ".";
  }

  function getAllGradeSummaries(selectedSchoolId) {
    var all = [];
    state.data.schools.filter(function (school) {
      return !selectedSchoolId || school.id === selectedSchoolId;
    }).forEach(function (school) {
      state.data.grades.forEach(function (grade) {
        var summary = buildGradeSummary(school.id, grade.id);
        if (summary) {
          all.push(summary);
        }
      });
    });
    return all;
  }

  function countSkillDirections(summaries, direction) {
    var counts = {};
    summaries.forEach(function (summary) {
      summary.skillSnapshots.forEach(function (snapshot) {
        if (snapshot.changeDirection === direction) {
          counts[snapshot.skill.name] = (counts[snapshot.skill.name] || 0) + 1;
        }
      });
    });

    return Object.keys(counts).map(function (name) {
      return { name: name, count: counts[name] };
    }).sort(function (a, b) {
      return b.count - a.count;
    });
  }

  function getSessionsForGrade(schoolId, gradeId) {
    return state.data.sessions.filter(function (session) {
      return session.schoolId === schoolId && session.gradeId === gradeId;
    });
  }

  function getSchoolById(id) {
    return findById(state.data.schools, id) || { id: 0, name: "Unknown school", district: "" };
  }

  function getGradeById(id) {
    return findById(state.data.grades, id) || { id: 0, name: "Unknown grade", order: 0 };
  }

  function getSkillById(id) {
    return findById(state.data.skills, id) || { id: 0, name: "Unknown skill", unit: "score", betterDirection: "higher" };
  }

  function getCoachNameById(id) {
    var user = findById(state.data.users, id);
    return user ? user.name : "Selected coach";
  }

  function hasUnreadAlertForIncident(incidentId) {
    return (state.data.alerts || []).some(function (alert) {
      return alert.incidentId === incidentId && !alert.isRead;
    });
  }

  function findById(items, id) {
    return items.find(function (item) {
      return item.id === id;
    }) || null;
  }

  function findResult(results, skillId) {
    return results.find(function (result) {
      return result.skillId === skillId;
    }) || null;
  }

  function isViewAllowed(view, role) {
    var allowedByRole = {
      admin: ["overview", "reports", "setup", "activity", "incidents"],
      coach: ["overview", "capture", "activity", "incidents"]
    };
    return Boolean(allowedByRole[role] && allowedByRole[role].indexOf(view) !== -1);
  }

  function defaultViewForRole(role) {
    return role === "coach" ? "overview" : "overview";
  }

  function describeUserAccess(user) {
    if (!user) {
      return "";
    }
    if (user.role === "admin") {
      return "District-wide admin access";
    }
    if (user.role === "coach") {
      return user.schoolName ? user.schoolName + " coach workspace" : "Assigned coach workspace";
    }
    return "Staff workspace";
  }

  function getIncidentStatusLabel(status) {
    var labels = {
      new: "New",
      seen: "Seen",
      noted: "Noted",
      follow_up: "Follow-Up Planned",
      closed: "Closed"
    };
    return labels[status] || "New";
  }

  function getIncidentStatusClass(status) {
    var classes = {
      new: "incident-status-new",
      seen: "incident-status-seen",
      noted: "incident-status-noted",
      follow_up: "incident-status-follow-up",
      closed: "incident-status-closed"
    };
    return classes[status] || "incident-status-new";
  }

  function getPerformanceBand(score) {
    if (score >= 85) {
      return "score-strong";
    }
    if (score >= 65) {
      return "score-watch";
    }
    return "score-risk";
  }

  function getPracticeTip(skillName) {
    return skillPlaybooks[skillName] || "Keep building movement quality, balance, and repeatable mechanics through short, fun practice blocks.";
  }

  function normalizeForChart(snapshot) {
    if (snapshot.skill.betterDirection === "higher") {
      return snapshot.currentScore;
    }
    return 100 / snapshot.currentScore;
  }

  function average(values) {
    if (!values.length) {
      return 0;
    }
    var total = values.reduce(function (sum, value) {
      return sum + value;
    }, 0);
    return total / values.length;
  }

  function roundTo(value, decimals) {
    var factor = Math.pow(10, decimals || 0);
    return Math.round(value * factor) / factor;
  }

  function formatRole(role) {
    if (role === "admin") {
      return "Admin";
    }
    if (role === "coach") {
      return "Coach";
    }
    return "Staff";
  }

  function formatUnit(unit) {
    return getUnitMeta(unit).label;
  }

  function formatScore(score, unit) {
    var meta = getUnitMeta(unit);
    var formatted = formatNumeric(score, meta.decimals);

    if (!meta.suffix) {
      return formatted;
    }
    if (meta.suffix === "%") {
      return formatted + meta.suffix;
    }
    return formatted + meta.suffix;
  }

  function formatChange(change, unit, absolute) {
    var meta = getUnitMeta(unit);
    var value = absolute ? Math.abs(change) : change;
    var prefix = absolute ? "" : change > 0 ? "+" : "";
    var formatted = formatNumeric(value, meta.decimals);

    if (!meta.suffix) {
      return prefix + formatted;
    }
    if (meta.suffix === "%") {
      return prefix + formatted + meta.suffix;
    }
    return prefix + formatted + meta.suffix;
  }

  function formatLongDate(dateString) {
    return new Date(dateString + "T12:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function formatDateTime(dateString) {
    var value = new Date(dateString);
    if (isNaN(value.getTime())) {
      return dateString;
    }
    return value.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function formatShortDate(dateString) {
    return new Date(dateString + "T12:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    });
  }

  function buildIsoDateOffset(days) {
    var date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function isFreshCoachSubmission(createdAt, fallbackDate) {
    if (createdAt) {
      var created = new Date(createdAt);
      if (!isNaN(created.getTime())) {
        return (Date.now() - created.getTime()) <= freshSubmissionWindowMinutes * 60 * 1000;
      }
    }
    if (!fallbackDate) {
      return false;
    }
    return fallbackDate === new Date().toISOString().slice(0, 10);
  }

  function getUnitMeta(unit) {
    var key = String(unit || "").trim().toLowerCase();
    if (unitPresets[key]) {
      return unitPresets[key];
    }

    return {
      label: toTitleCase(key || "custom metric"),
      suffix: key ? " " + key : "",
      decimals: 4,
      defaultDirection: "higher"
    };
  }

  function getSuggestedDirection(unit) {
    return getUnitMeta(unit).defaultDirection || null;
  }

  function formatNumeric(value, decimals) {
    return Number(value).toFixed(decimals || 4).replace(/\.?0+$/, "");
  }

  function toTitleCase(value) {
    return String(value)
      .split(/\s+/)
      .filter(function (part) {
        return Boolean(part);
      })
      .map(function (part) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(" ");
  }

  function setDefaultDates() {
    var today = new Date().toISOString().slice(0, 10);
    els.sessionDate.value = today;
    if (els.eodDate) {
      els.eodDate.value = today;
    }
    if (els.eodClasses) {
      els.eodClasses.value = "4";
    }
    if (els.ocrDate) {
      els.ocrDate.value = today;
    }
    if (els.commentDate) {
      els.commentDate.value = today;
    }
    if (els.incidentDate) {
      els.incidentDate.value = today;
    }
  }

  function firstId(items) {
    return items.length ? items[0].id : 0;
  }

  function eachNode(nodeList, callback) {
    Array.prototype.forEach.call(nodeList, callback);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
