/* Todoist Inbox
- https://developer.todoist.com/rest/v1/#create-a-new-task
- https://todoist.com/help/articles/set-a-recurring-due-date#some-examples-of-recurring-due-dates
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
*/

const apiToken = Action.preferences.apiToken;
var dateStrings = File.readJSON(
  '~/Library/Application Support/LaunchBar/Actions/Todoist Inbox.lbaction/Contents/Resources/dateStrings.json'
);

// Localization
if (LaunchBar.currentLocale == 'de') {
  var p1 = 'Priorität 1';
  var p2 = 'Priorität 2';
  var p3 = 'Priorität 3';
  var lang = 'de';
  var refresh = 'Projekte & Etiketten aktualisieren.';
  var titleReset = 'Zurücksetzen';
  var subReset = 'Nutzungsdaten werden zurückgesetzt!';
  var titleUpdate = 'Aktualisieren';
  var subUpdate = 'Es werden nur neue Projekte und Etiketten hinzugefügt.';
  var resetNotificationTitle = 'Projekte & Etiketten wurden zurückgesetzt.';
  var updateNotificationTitle = 'Projekte & Etiketten wurden aktualisiert.';
  var updateNotificationString = ' Änderung(en)';
  var setKey = 'API-Token erneuern';
  var setKeySub = 'API-Token zuerst in die Zwischenablage kopieren!';
  var dueStringTitle = ', Fällig: ';
  var notiSettings = 'Bestätigungsmitteilungen';
  var nSubOff = 'Eingabetaste drücken, um Mitteilungen auszuschalten.';
  var nSubOn = 'Eingabetaste drücken, um Mitteilungen anzuschalten.';
  var notificationStringFallback = 'wurde zu Todoist hinzugefügt!';
  var inboxName = 'Eingang';
  var done = 'Fertig!';

  dateStrings = dateStrings.de;
} else {
  var p1 = 'Priority 1';
  var p2 = 'Priority 2';
  var p3 = 'Priority 3';
  var lang = 'en';
  var refresh = 'Refresh projects & labels.';
  var titleReset = 'Reset';
  var subReset = 'This will overwrite usage data';
  var titleUpdate = 'Update';
  var subUpdate = 'Only new projects and lables will be added.';
  var resetNotificationTitle = 'Projects & labels reset.';
  var updateNotificationTitle = 'Projects & labels updated.';
  var updateNotificationString = ' change(s)';
  var setKey = 'Reset API-Token';
  var setKeySub = 'Make sure to copy your API-Token first!';
  var dueStringTitle = ', Due: ';
  var notiSettings = 'Confirmation Notifications';
  var nSubOff = 'Hit enter to turn off notifications';
  var nSubOn = 'Hit enter to turn on notifications';
  var notificationStringFallback = 'has been added to Todoist!';
  var inboxName = 'Inbox';
  var done = 'Done!';

  dateStrings = dateStrings.en;
}

function run(argument) {
  if (LaunchBar.options.shiftKey) {
    var output = settings();
    return output;
  } else {
    if (apiToken == undefined) {
      setApiKey();
    } else {
      // Priority
      if (/p[1-3]/.test(argument)) {
        var m = argument.match(/p[1-3]/);
        if (m == 'p1') {
          var prioValue = 4;
          var prioText = p1;
        } else if (m == 'p2') {
          var prioValue = 3;
          var prioText = p2;
        } else if (m == 'p3') {
          var prioValue = 2;
          var prioText = p3;
        }
        argument = argument.replace(/p[1-3]/, '');
      } else {
        var prioValue = 1;
        var prioText = '';
      }

      // Due/date String
      var dueString = '';

      if (argument.includes(' @')) {
        // with @ (should work for most cenarios except for "@date <title>")
        dueString = argument.match(/ @(.*?)(p\d|((^| )#($| ))|$)/)[1].trim();

        argument = argument
          .replace(/ @(.*?)(p\d|((^| )#($| ))|$)/, '$2')
          .trim();
      } else {
        // dateStrings
        for (var i = 0; i < dateStrings.length; i++) {
          var dateString = dateStrings[i];
          var re = new RegExp('(^| )' + dateString + '($| )', 'i');
          if (re.test(argument)) {
            dueString = argument.match(re)[0].trim();
            argument = argument.replace(re, ' ');
          }
        }
      }

      // Advanced Options (projects, labels)
      if (/#($| )/.test(argument)) {
        argument = argument.replace(/#($| )/, ' ').trim();
        var advanced = true;
      } else {
        var advanced = false;
      }

      argument = argument.replace(/\s+/g, ' ').trim();

      argument = argument.charAt(0).toUpperCase() + argument.slice(1);

      Action.preferences.taskDict = {
        content: argument,
        dueString: dueString,
        prioValue: prioValue,
        prioText: prioText,
        lang: lang,
      };

      if (advanced == true) {
        var output = advancedOptions();
        return output;
      } else {
        postTask();
      }
    }
  }
}

function advancedOptions() {
  var taskDict = Action.preferences.taskDict;

  var resultProjects = [];
  var resultPrioritized = [];
  var projects = Action.preferences.projects.data;
  for (var i = 0; i < projects.length; i++) {
    var name = projects[i].name;
    if (name == 'Inbox') {
      name = inboxName;
    }
    var id = projects[i].id;

    if (taskDict.dueString != '') {
      var sub =
        taskDict.content +
        dueStringTitle +
        taskDict.dueString +
        ', ' +
        taskDict.prioText;
    } else {
      var sub = taskDict.content + ', ' + taskDict.prioText;
    }
    sub = sub.trim().replace(/,$/, '');

    if (projects[i].usage == undefined) {
      var usage = 0;
    } else {
      var usage = projects[i].usage;
    }

    var pushDataProject = {
      title: name,
      subtitle: sub,
      icon: 'addToProjectTemplate',
      usage: usage,
      action: 'postTask',
      actionArgument: {
        type: 'project',
        name: name,
        id: id,
        index: i,
      },
    };

    if (projects[i].lastContent == taskDict.content) {
      resultPrioritized.push(pushDataProject);
    } else {
      resultProjects.push(pushDataProject);
    }
  }

  var resultLabels = [];
  var labels = Action.preferences.labels.data;
  for (var i = 0; i < labels.length; i++) {
    var name = labels[i].name;
    var id = labels[i].id;
    if (taskDict.dueString != '') {
      var sub =
        taskDict.content +
        dueStringTitle +
        taskDict.dueString +
        ', ' +
        taskDict.prioText;
    } else {
      var sub = taskDict.content + ', ' + taskDict.prioText;
    }
    sub = sub.trim().replace(/,$/, '');

    if (labels[i].usage == undefined) {
      var usage = 0;
    } else {
      var usage = labels[i].usage;
    }

    var pushDataLabel = {
      title: name,
      subtitle: sub,
      icon: 'labelTemplate',
      usage: usage,
      action: 'addProject',
      actionArgument: {
        name: name,
        id: id,
        index: i,
      },
    };

    if (labels[i].lastContent == taskDict.content) {
      resultPrioritized.push(pushDataLabel);
    } else {
      resultLabels.push(pushDataLabel);
    }
  }

  resultPrioritized.sort(function (a, b) {
    return b.usage - a.usage;
  });

  var both = resultProjects.concat(resultLabels);

  both.sort(function (a, b) {
    return b.usage - a.usage;
  });

  var result = resultPrioritized.concat(both);
  return result;
}

function addProject(labelDict) {
  var labelName = labelDict.name;
  var labelId = labelDict.id;
  var labelIndex = labelDict.index;
  var taskDict = Action.preferences.taskDict;

  var pinnedProject = [];
  var otherProjects = [];
  var projects = Action.preferences.projects.data;
  for (var i = 0; i < projects.length; i++) {
    var name = projects[i].name;
    if (name == 'Inbox') {
      name = inboxName;
    }
    var id = projects[i].id;
    if (taskDict.dueString != '') {
      var sub =
        '@' +
        labelName +
        ': ' +
        taskDict.content +
        dueStringTitle +
        taskDict.dueString +
        ', ' +
        taskDict.prioText;
    } else {
      var sub =
        '@' + labelName + ': ' + taskDict.content + ', ' + taskDict.prioText;
    }
    sub = sub.trim().replace(/,$/, '');

    var projectPushData = {
      title: name,
      subtitle: sub,
      icon: 'addToProjectTemplate',
      action: 'postTask',
      actionArgument: {
        type: 'projectAndLabel',
        name: name,
        id: id,
        index: i,
        labelId: labelId,
        labelIndex: labelIndex,
      },
    };

    var labels = Action.preferences.labels.data;
    var lastUsedCategoryId = labels[labelIndex].lastUsedCategoryId;
    if (lastUsedCategoryId != undefined && lastUsedCategoryId == id) {
      pinnedProject.push(projectPushData);
    } else {
      otherProjects.push(projectPushData);
    }
  }
  var result = pinnedProject.concat(otherProjects);
  return result;
}

function postTask(advancedData) {
  LaunchBar.hide();

  var taskDict = Action.preferences.taskDict;

  if (advancedData != undefined) {
    var projectIndex = advancedData.index;
    var projectUsageCount =
      Action.preferences.projects.data[projectIndex].usage;

    if (projectUsageCount == undefined) {
      Action.preferences.projects.data[projectIndex].usage = 1;
    } else {
      var newProjectCount = projectUsageCount + 1;
      Action.preferences.projects.data[projectIndex].usage = newProjectCount;
    }

    if (advancedData.type == 'project') {
      var body = {
        content: taskDict.content,
        due_lang: taskDict.lang,
        due_string: taskDict.dueString,
        priority: taskDict.prioValue,
        project_id: advancedData.id,
      };

      // remember used content (= title)
      Action.preferences.projects.data[projectIndex].lastContent =
        Action.preferences.taskDict.content;
    } else if (advancedData.type == 'projectAndLabel') {
      var labelId = advancedData.labelId;
      var labelIndex = advancedData.labelIndex;

      Action.preferences.labels.data[labelIndex].lastUsedCategoryId =
        advancedData.id;

      var labelUsageCount = Action.preferences.labels.data[labelIndex].usage;

      if (labelUsageCount == undefined) {
        Action.preferences.labels.data[labelIndex].usage = 1;
      } else {
        var newLabelCount = labelUsageCount + 1;
        Action.preferences.labels.data[labelIndex].usage = newLabelCount;
      }

      var body = {
        content: taskDict.content,
        due_lang: taskDict.lang,
        due_string: taskDict.dueString,
        label_ids: [labelId],
        priority: taskDict.prioValue,
        project_id: advancedData.id,
      };

      // remember used content (= title)
      Action.preferences.labels.data[labelIndex].lastContent =
        Action.preferences.taskDict.content;
    }
  } else {
    var body = {
      content: taskDict.content,
      due_lang: taskDict.lang,
      due_string: taskDict.dueString,
      priority: taskDict.prioValue,
    };
  }

  var result = HTTP.postJSON(
    'https://api.todoist.com/rest/v1/tasks?token=' + apiToken,
    {
      body: body,
    }
  );

  if (result.error == undefined) {
    if (result.response.status != 200) {
      LaunchBar.displayNotification({
        title: 'Todoist Action Error',
        string:
          result.response.status +
          ': ' +
          result.response.localizedStatus +
          ': ' +
          result.data,
      });
      if (result.response.status == 401) {
        Action.preferences.apiToken = undefined; // to promt API token entry dialog
      }
    } else {
      if (Action.preferences.notifications != false) {
        // Confirmation notification
        var data = eval('[' + result.data + ']')[0];
        var taskId = data.id;
        var link = 'todoist://showTask?id=' + taskId;

        var projectId = data.project_id;
        var projects = Action.preferences.projects.data;
        for (var i = 0; i < projects.length; i++) {
          var id = projects[i].id;
          if (projectId == id) {
            var projectName = projects[i].name;
            break;
          }
        }

        if (projectName != 'Inbox') {
          var projectString = '#' + projectName;
        } else {
          var projectString = '';
        }

        var dueInfo = data.due;
        if (dueInfo != undefined) {
          if (dueInfo.datetime != undefined) {
            var dueDateTime = LaunchBar.formatDate(new Date(dueInfo.datetime), {
              relativeDateFormatting: true,
            });
          } else {
            var dueDateTime = LaunchBar.formatDate(new Date(dueInfo.date), {
              relativeDateFormatting: true,
              timeStyle: 'none',
            });
          }
          if (dueInfo.recurring == true) {
            var notificationString =
              '⏰ ' +
              dueDateTime +
              ' 🔁 ' +
              dueInfo.string +
              '\n' +
              projectString;
          } else {
            var notificationString = '⏰ ' + dueDateTime + '\n' + projectString;
          }
        } else {
          var notificationString = projectString;
        }

        var labelId = data.label_ids[0];
        if (labelId != undefined) {
          var labels = Action.preferences.labels.data;
          for (var i = 0; i < labels.length; i++) {
            var id = labels[i].id;
            if (labelId == id) {
              var labelName = labels[i].name;
              break;
            }
          }
          notificationString = notificationString + ' @' + labelName;
        }

        if (data.priority == 4) {
          notificationString = '🔴 ' + notificationString;
        } else if (data.priority == 3) {
          notificationString = '🟠 ' + notificationString;
        } else if (data.priority == 2) {
          notificationString = '🔵 ' + notificationString;
        }

        if (notificationString == '') {
          notificationString = notificationStringFallback;
        }

        // Send Notification
        LaunchBar.displayNotification({
          title: data.content,
          string: notificationString,
          url: link,
        });
      }
    }
  } else {
    LaunchBar.displayNotification({
      title: 'Todoist Action Error',
      string: result.error,
    });
  }
}

function settings() {
  if (Action.preferences.notifications == undefined) {
    var nIcon = 'notiTemplate';
    var nArgument = 'off';
    var nSub = nSubOff;
  } else {
    var nIcon = 'notiOffTemplate';
    var nArgument = 'on';
    var nSub = nSubOn;
  }

  return [
    {
      title: notiSettings,
      subtitle: nSub,
      icon: nIcon,
      action: 'notificationSetting',
      actionArgument: nArgument,
    },
    {
      title: setKey,
      // subtitle: setKeySub,
      icon: 'keyTemplate',
      action: 'setApiKey',
    },
    {
      title: refresh,
      icon: 'refreshTemplate',
      action: 'refreshData',
    },
  ];
}

function notificationSetting(nArgument) {
  if (nArgument == 'off') {
    Action.preferences.notifications = false;
  } else {
    Action.preferences.notifications = undefined;
  }
  var output = settings();
  return output;
}

function setApiKey() {
  var response = LaunchBar.alert(
    'API-Token required',
    '1) Go to Settings/Integrations and copy the API-Token.\n2) Press »Set API-Token«',
    'Open Settings',
    'Set API-Token',
    'Cancel'
  );
  switch (response) {
    case 0:
      LaunchBar.openURL('https://todoist.com/app/settings/integrations');
      LaunchBar.hide();
      break;
    case 1:
      var clipboardConent = LaunchBar.getClipboardString().trim();

      if (clipboardConent.length == 40) {
        // Test API-Token
        var projects = HTTP.getJSON(
          'https://api.todoist.com/rest/v1/projects?token=' + clipboardConent
        );

        if (projects.error != undefined) {
          LaunchBar.alert(projects.error);
        } else {
          Action.preferences.apiToken = clipboardConent;

          Action.preferences.projects = projects;

          var labels = HTTP.getJSON(
            'https://api.todoist.com/rest/v1/labels?token=' + clipboardConent
          );
          Action.preferences.labels = labels;

          LaunchBar.alert(
            'Success!',
            'API-Token set to: ' +
              Action.preferences.apiToken +
              '.\nProjects and labels loaded.'
          );
        }
      } else {
        LaunchBar.alert(
          'The length of the clipboard content does not match the length of a correct API-Token',
          'Make sure the API-Token is the most recent item in the clipboard!'
        );
      }
      break;
    case 2:
      break;
  }
}

function refreshData() {
  if (apiToken == undefined) {
    setApiKey();
  } else {
    return [
      {
        title: titleUpdate,
        subtitle: subUpdate,
        icon: 'refreshTemplate',
        action: 'update',
      },
      {
        title: titleReset,
        subtitle: subReset,
        icon: 'refreshTemplate',
        action: 'reset',
      },
    ];
  }
}

function update() {
  LaunchBar.hide();

  var projectsOnline = HTTP.getJSON(
    'https://api.todoist.com/rest/v1/projects?token=' + apiToken
  );
  if (projectsOnline.error != undefined) {
    LaunchBar.alert(projectsOnline.error);
  } else {
    // Projects
    var projectsLocal = Action.preferences.projects;

    // Compare Online to Local payee data
    var projectIds = projectsLocal.data.map((ch) => ch.id);
    var newProjectIds = projectsOnline.data.filter(
      (ch) => !projectIds.includes(ch.id)
    );

    for (var i = 0; i < newProjectIds.length; i++) {
      projectsLocal.data.push(newProjectIds[i]);
    }

    // Labels
    var labelsOnline = HTTP.getJSON(
      'https://api.todoist.com/rest/v1/labels?token=' + apiToken
    );

    var labelsLocal = Action.preferences.labels;

    // Compare Online to Local payee data
    var labelIds = labelsLocal.data.map((ch) => ch.id);
    var newLabelIds = labelsOnline.data.filter(
      (ch) => !labelIds.includes(ch.id)
    );

    for (var i = 0; i < newLabelIds.length; i++) {
      labelsLocal.data.push(newLabelIds[i]);
    }

    var changes = newLabelIds.length + newProjectIds.length;

    LaunchBar.displayNotification({
      title: updateNotificationTitle,
      string: changes + updateNotificationString,
    });
  }
}

function reset() {
  LaunchBar.hide();

  var projectsOnline = HTTP.getJSON(
    'https://api.todoist.com/rest/v1/projects?token=' + apiToken
  );
  if (projectsOnline.error != undefined) {
    LaunchBar.alert(projectsOnline.error);
  } else {
    // Projects
    Action.preferences.projects = projectsOnline;

    // Labels
    var labelsOnline = HTTP.getJSON(
      'https://api.todoist.com/rest/v1/labels?token=' + apiToken
    );

    Action.preferences.labels = labelsOnline;

    LaunchBar.displayNotification({
      title: resetNotificationTitle,
    });
  }
}