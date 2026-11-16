import {mountWidget} from '../ui/widget.js';
import {formatTooltip,formatRate} from './messages.mjs';

export function widgetSource(language='zh-CN') {
  if(!['zh-CN','en'].includes(language)) throw new Error('Language must be zh-CN or en');
  return `(${mountWidget.toString()})(${JSON.stringify(language)},${formatTooltip.toString()},${formatRate.toString()});`;
}
