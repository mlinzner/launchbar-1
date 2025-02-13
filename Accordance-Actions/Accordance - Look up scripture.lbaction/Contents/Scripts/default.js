/* Accordance Look Up by Ptujec 2021-07-22

Sources: 
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
- http://www.accordancebible.com/Accordance-1043-Is-Automagical/
- http://accordancefiles2.com/helpfiles/OSX12/Default.htm#topics/05_dd/using_links_common_tasks.htm#kanchor184 (See: Examples of Accordance-specific URLs)
- https://stackoverflow.com/a/13012698 (if contains statement)
*/

const bookNameDictionary = File.readJSON(
  Action.path + '/Contents/Resources/booknames.json'
); // Currently contains German and Slovene names. You could expand it with your language by adding the relevant names to the "alt" array.

const AccordancePrefs = eval(
  File.readText('~/Library/Preferences/Accordance Preferences/General.apref')
)[0];

function run(argument) {
  argument = argument.trim();

  // Check Vers Notation Setting (see checkbox in "Appearance" section of Accoradance Preferences)
  var num =
    AccordancePrefs['com.oaktree.settings.general.useeuropeanversenotation'];

  if (num == 0) {
    // Default Vers Notation
    var result = argument;
  } else {
    // Add number of first chapternumber if just a bookname is given
    var numCheck = / \d/.test(argument);
    if (numCheck == false) {
      argument = argument + ' 1';
    }

    // European Vers Notation
    argument = argument
      // clean up capture (e.g. brackets) and formart errors (e.g. spaces before or after verse numbers) in entry
      .replace(/\(|\)/g, '')
      .replace(/(\s+)?([\-–,:])(\s+)?/g, '$2');

    var mA = argument.match(
      /(?:[1-5]\.?\s?)?(?:[a-zžščöäü ]+\.?\s?)?[0-9,.:\-–f]+/gi
    );

    if (mA == undefined) {
      var result = argument;
    } else {
      var result = [];
      for (var i = 0; i < mA.length; i++) {
        var scrip = mA[i].trim();

        // makes sure non-european styles get converted
        if (scrip.includes(':')) {
          scrip = scrip.replace(/,/g, '.').replace(/:/g, ',');
        }

        var mB = scrip.match(
          /([1-5]\.?\s?)?([a-zžščöäü ]+\.?\s?)?([0-9,.:\-–f]+)/i
        );

        var prefix = mB[1];

        if (prefix == undefined) {
          prefix = '';
        } else {
          prefix = prefix.replace(/\./, '');
        }

        var bookName = mB[2];

        if (bookName == undefined) {
          bookName = '';
        } else {
          bookName = replaceBookName(bookName);
        }
        var suffix = mB[3];

        var newScrip = prefix + bookName + suffix;

        result.push(newScrip + ' ');
      }
    }

    result = result
      .toString()
      .replace(/ ,/g, '; ')
      .trim()
      .replace(/1 ?Moses/, 'Genesis')
      .replace(/2 ?Moses/, 'Exodus')
      .replace(/3 ?Moses/, 'Leviticus')
      .replace(/4 ?Moses/, 'Numbers')
      .replace(/5 ?Moses/, 'Deuteronomy');
  }
  var output = lookUp(result, argument);
  return output;
}

function lookUp(result, argument) {
  // UI language check
  var aPlist = File.readPlist(
    '~/Library/Preferences/com.OakTree.Accordance.plist'
  );
  var lang = aPlist.AppleLanguages;

  if (lang != undefined) {
    lang = lang.toString();
  } else {
    var gPlist = File.readPlist(
      '/Library/Preferences/.GlobalPreferences.plist'
    );
    lang = gPlist.AppleLanguages.toString();
  }

  if (lang.startsWith('de')) {
    var allTextSetting = '[Alle_Texte];Verses?';
  } else {
    var allTextSetting = '[All_Texts];Verses?';
  }

  // if (LaunchBar.options.shiftKey) {
  //   // Force read option
  //   LaunchBar.openURL('accord://read/?' + encodeURIComponent(result));
  // } else if (LaunchBar.options.alternateKey) {
  //   // Force research option
  //   LaunchBar.openURL(
  //     'accord://research/' + allTextSetting + encodeURIComponent(result)
  //   );
  // } else {

  // Smart option
  if (
    LaunchBar.options.commandKey ||
    result.endsWith('f') ||
    result.includes('-') ||
    result.includes('–') ||
    result.includes(';') ||
    !result.includes(',')
  ) {
    if (LaunchBar.options.commandKey) {
      var output = chooseTranslation(result, argument);
      return output;
    } else {
      LaunchBar.openURL('accord://read/?' + encodeURI(result));
    }
  } else {
    LaunchBar.openURL(
      'accord://research/' + allTextSetting + encodeURI(result)
    );
  }
  // }
}

function chooseTranslation(result, argument) {
  var translations = File.getDirectoryContents(
    '~/Library/Application Support/Accordance/Modules/Texts'
  );

  var lastUsedTranslation = [];
  var otherTranslations = [];
  for (var i = 0; i < translations.length; i++) {
    var translation = translations[i].split('.')[0];

    if (translations[i].split('.')[1] == 'atext') {
      var plistPath =
        '~/Library/Application Support/Accordance/Modules/Texts/' +
        translation +
        '.atext/Info.plist';

      if (!File.exists(plistPath)) {
        plistPath =
          '~/Library/Application Support/Accordance/Modules/Texts/' +
          translation +
          '.atext/ExtraInfo.plist';
      }

      var plist = File.readPlist(plistPath);
      var translationName = plist['com.oaktree.module.humanreadablename'];
      if (translationName == undefined) {
        var translationName = plist['com.oaktree.module.fullmodulename'];
        if (translationName == undefined) {
          var translationName = translation.trim().replace('°', '');
        }
      }
    } else {
      var translationName = translation.trim().replace('°', '');
    }

    var pushContent = {
      title: translationName,
      subtitle: argument,
      icon: 'bookTemplate',
      action: 'lookupInTranslation',
      actionArgument: {
        translation: translation,
        result: result,
      },
    };

    var translationUsage = Action.preferences.translationUsage;

    if (translationUsage != undefined) {
      for (var j = 0; j < translationUsage.length; j++) {
        if (translationUsage[j].translation == translation) {
          pushContent.usage = translationUsage[j].usage;
          break;
        } else {
          pushContent.usage = 0;
        }
      }
    }

    if (translation === Action.preferences.lastUsed) {
      lastUsedTranslation.push(pushContent);
    } else {
      otherTranslations.push(pushContent);
    }
  }
  otherTranslations.sort(function (a, b) {
    return b.usage - a.usage || a.title.localeCompare(b.title);
  });

  var translationResult = lastUsedTranslation.concat(otherTranslations);
  return translationResult;
}

function lookupInTranslation(dict) {
  var translation = dict.translation;
  var result = dict.result;

  // Write usage data
  var translationUsage = Action.preferences.translationUsage;

  if (translationUsage == undefined) {
    Action.preferences.translationUsage = [
      {
        translation: translation,
        usage: 1,
      },
    ];
  } else {
    for (var i = 0; i < translationUsage.length; i++) {
      if (translationUsage[i].translation == translation) {
        var usage = translationUsage[i].usage;
        Action.preferences.translationUsage[i].usage = usage + 1;
        var found = true;
      }
    }
    if (found != true) {
      Action.preferences.translationUsage.push({
        translation: translation,
        usage: 1,
      });
    }
  }

  Action.preferences.lastUsed = translation;

  // LaunchBar.alert(encodeURI(translation));
  // return;

  LaunchBar.hide();
  LaunchBar.openURL(
    'accord://read/' + encodeURI(translation) + '?' + encodeURI(result)
  );
}

function replaceBookName(bookName) {
  // Replace alternative booknames and abbreviations with the english name (so Accordance can parse it correctly)
  var newBookName = '';
  bookName = bookName.trim().replace(/\./, '').toLowerCase();

  var bookNames = bookNameDictionary.booknames;

  for (var i = 0; i < bookNames.length; i++) {
    var englishName = bookNames[i].english.toLowerCase();
    var altNames = bookNames[i].alt;

    if (englishName.startsWith(bookName)) {
      newBookName = bookNames[i].english;
      break;
    }

    for (var j = 0; j < altNames.length; j++) {
      var altName = altNames[j].toLowerCase();

      if (altName.startsWith(bookName)) {
        newBookName = bookNames[i].english;
        var isBreak = true;
        break;
      }
    }
    var abbrs = bookNames[i].abbr;
    for (var k = 0; k < abbrs.length; k++) {
      var abbr = abbrs[k].toLowerCase();
      if (bookName == abbr) {
        newBookName = bookNames[i].english;
        var isBreak = true;
        break;
      }
    }

    if (isBreak == true) {
      break;
    }
  }

  if (newBookName != '') {
    bookName = newBookName + ' ';
  }
  return bookName;
}
