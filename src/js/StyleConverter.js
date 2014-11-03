/** @jsx React.DOM */
/* Lifted mostly as-is from RCSS */

var _ = require('lodash');

var _uppercasePattern = /([A-Z])/g;
var msPattern = /^ms-/;

function hyphenateProp(string) {
  // MozTransition -> -moz-transition
  // msTransition -> -ms-transition. Notice the lower case m
  // http://modernizr.com/docs/#prefixed
  // thanks a lot IE
  return string.replace(_uppercasePattern, '-$1')
    .toLowerCase()
    .replace(msPattern, '-ms-');
}

function escapeValueForProp(value, prop) {
  // 'content' is a special property that must be quoted
  if (prop === 'content') {
    return '"' + value + '"';
  }
  return _.escape(value);
}

function declarationToString(keyframeNameMap, propName, value) {
  var cssPropName = hyphenateProp(propName);
  var value = escapeValueForProp(value, cssPropName);
  if (cssPropName.contains('animation')) {
    _.forEach(keyframeNameMap, (newkeyframeName, oldkeyframeName) => {
      if (value.contains(oldkeyframeName)) {
        value = value.replace(oldkeyframeName, newkeyframeName);
      }
    });
  }
  return '  ' + cssPropName + ': ' + value + ';\n';
}

function getkeyframeNameMap(className, styles) {
  var keyframeNames = Object.keys(styles)
    .filter(key => key.startsWith('@keyframes'))
    .map(key => key.split(' ')[1]);
  return _.object(
    keyframeNames,
    keyframeNames.map(name => className + '_' + name)
  );
}

function indent(text, tabs) {
  tabs = tabs || 1;
  var spaces = new Array(tabs + 1).join('  ');
  return text.split('\n').map(t => spaces + t).join('\n');
}

function ruleSetToString(className, styles) {
  var keyframeNameMap = getkeyframeNameMap(className, styles);
  var declarations = [];
  var pseudos = [];
  var mediaQueries = [];
  var keyframes = [];

  for (var key in styles) {
    if (!styles.hasOwnProperty(key)) {
      continue;
    }

    if (key[0] === ':') {
      pseudos.push(
        '.' + className + key + ' {\n' +
        _.map(
          styles[key],
          (v, k) => declarationToString(keyframeNameMap, k, v)
        ).join('') + '}'
      );
    } else if (key.startsWith('@media')) {
      mediaQueries.push(
        key + ' {\n' +
        indent(ruleSetToString(className, styles[key])) +
        '\n}'
      );
    } else if (key.startsWith('@keyframes')) {
      var keyframeName = key.split(' ')[1];
      var newkeyframeName = keyframeNameMap[keyframeName];
      keyframes.push('@keyframes ' + newkeyframeName + ' {\n' +
        indent(
          _.map(styles[key], (keyframeStyles, percentage) => {
            return percentage + ' {\n' +
              _.map(
                keyframeStyles,
                (v, k) => declarationToString(keyframeNameMap, k, v)
              ).join('') +
              '}';
          }).join('\n')
        ) + '\n}'
      );
    } else {
      declarations.push(declarationToString(keyframeNameMap, key, styles[key]));
    }
  }

  var markup = '';
  if (declarations.length) {
    markup = '.' + className + ' {\n' + declarations.join('') + '}';
  }

  return [].concat(markup, pseudos, mediaQueries, keyframes).join('\n');
}

module.exports = {
  toCssString: ruleSetToString
};
