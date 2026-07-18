import type {
  DateLocale,
  TimeUnit,
  DateFormatCache,
  TimeTokenFormatter,
  DateFormatOption,
  DateFormatToken,
  FormatToken,
  DateParseCache,
  DateParseOption,
  PadOption,
} from './type';

const MILLISECONDS_IN_DAY = 86400000;
const MILLISECONDS_IN_HOUR = 3600000;
const MILLISECONDS_IN_MINUTE = 60000;
const TIMEZONE_OFFSET_IN_MINUTE = new Date().getTimezoneOffset();
const TIMEZONE_OFFSET = TIMEZONE_OFFSET_IN_MINUTE * MILLISECONDS_IN_MINUTE;
const tokenRegex = /'(?:[^']|'')+'|yy(?:yy)?|M{1,4}|d{1,2}|D{1,2}|E{1,3}|H{1,2}|h{1,2}|m{1,2}|s{1,2}|S{1,3}|Z{1,2}|Q{1,2}|k{1,2}|K{1,2}|e|a/g;
const defaultDateLocale: Required<DateLocale> = {
  weeks: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
  weeksShort: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
  months: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
  monthsShort: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
  quarters: ['春', '夏', '秋', '冬'],
  am: '上午',
  pm: '下午',
};
//region pad
/**
 * 填充字符串
 * @param value			需要被填充的值
 * @param length		最小位数
 * @param [option]		选项
 * @return 填充后的值
 */
function pad(value: number | string, length: number, option?: PadOption): string {
  const { char = '0', start = true } = option || {};
  const val = '' + value;
  if (val.length >= length) {
    return val;
  } else {
    let pad = char;
    for (let i = length - val.length - 1; i > 0; --i) {
      pad += char;
    }
    return start ? pad + val : val + pad;
  }
}
//endregion
//region numberToString
const urlSafeChar = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-';
/**
 * 把数字转换为 'A-Za-z0-9_-'
 * @param num 转换的数字
 * @return 转换后的字符串
 */
function numberToString(num: number): string {
  let res = '';
  do {
    res = urlSafeChar[num & 63] + res;
    num >>>= 6;
  } while (num);
  return res;
}
//endregion
//region getUid
/**
 * 获取唯一键
 * 获取和当前时间相关的唯一键
 * @return 唯一键
 */
function getUid(): string {
  return pad(numberToString(Math.floor(Math.random() * (64 * 64 * 64))), 3) + numberToString(Date.now());
}
//endregion
//region replaceString
/**
 * 字符串替换
 * @param src		原始字符串
 * @param search	搜索值
 * @param replace	替换值
 * @return 替换后的字符串
 */
function replaceString(src: string, search: string, replace: string): string {
  let pos = 0;
  let next = src.indexOf(search);
  let str = '';
  while (next !== -1) {
    str += src.slice(pos, next) + replace;
    pos = next + search.length;
    next = src.indexOf(search, pos);
  }
  return str + src.slice(pos);
}
//endregion
//region startOfDate
/**
 * 获取一个日期指定单位的开始日期
 * @param date		日期
 * @param unit		时间单位
 * @param [self]	是否修改传入的日期
 * @return 日期
 */
function startOfDate(date: Date, unit: TimeUnit, self?: boolean): Date {
  const time = self ? date : new Date(date);
  if (unit === 'year') {
    time.setMonth(0, 1);
    time.setHours(0, 0, 0, 0);
  } else if (unit === 'month') {
    time.setDate(1);
    time.setHours(0, 0, 0, 0);
  } else if (unit === 'day') {
    time.setHours(0, 0, 0, 0);
  } else if (unit === 'hour') {
    time.setMinutes(0, 0, 0);
  } else if (unit === 'minute') {
    time.setSeconds(0, 0);
  } else {
    time.setMilliseconds(0);
  }
  return time;
}
//endregion
//region endOfDate
/**
 * 获取一个日期指定单位的结束日期
 * @param date		日期
 * @param unit		时间单位
 * @param [self]	是否修改传入的日期
 * @return 日期
 */
function endOfDate(date: Date, unit: TimeUnit, self?: boolean): Date {
  const time = self ? date : new Date(date);
  if (unit === 'year') {
    time.setFullYear(date.getFullYear() + 1, 0, 0);
    time.setHours(23, 59, 59, 999);
  } else if (unit === 'month') {
    time.setMonth(date.getMonth() + 1, 0);
    time.setHours(23, 59, 59, 999);
  } else if (unit === 'day') {
    time.setHours(23, 59, 59, 999);
  } else if (unit === 'hour') {
    time.setMinutes(59, 59, 999);
  } else if (unit === 'minute') {
    time.setSeconds(59, 999);
  } else {
    time.setMilliseconds(999);
  }
  return time;
}
//endregion
//region getDateDiff
function _getDiff(date: number, subtract: number, interval: number): number {
  return Math.floor((date - TIMEZONE_OFFSET) / interval) - Math.floor((subtract - TIMEZONE_OFFSET) / interval);
}
/**
 * 获取2个日期间指定单位的时间差
 * @param date		日期1
 * @param subtract	日期2
 * @param unit		时间单位
 * @return			多少个单位
 */
function getDateDiff(date: Date, subtract: Date, unit: TimeUnit): number {
  if (unit === 'year') {
    return date.getFullYear() - subtract.getFullYear();
  } else if (unit === 'month') {
    return (date.getFullYear() - subtract.getFullYear()) * 12 + date.getMonth() - subtract.getMonth();
  } else if (unit === 'day') {
    return _getDiff(date.getTime(), subtract.getTime(), MILLISECONDS_IN_DAY);
  } else if (unit === 'hour') {
    return _getDiff(date.getTime(), subtract.getTime(), MILLISECONDS_IN_HOUR);
  } else if (unit === 'minute') {
    return _getDiff(date.getTime(), subtract.getTime(), MILLISECONDS_IN_MINUTE);
  } else {
    return _getDiff(date.getTime(), subtract.getTime(), 1000);
  }
}
//endregion
//region daysInMonth
/**
 * 当月的天数
 * @param date		通过date查询
 * @param [self]	是否修改传入的日期
 * @return		天数
 */
function daysInMonth(date: Date, self?: boolean): number;
/**
 * 当月的天数
 * @param year	查询的年
 * @param month	查询的月(1-12)
 * @return		天数
 */
function daysInMonth(year: number, month: number): number;
function daysInMonth(dateOrYear: Date | number, selfOrMonth?: number | boolean): number {
  if (typeof dateOrYear === 'number') {
    return new Date(dateOrYear, selfOrMonth! as number, 0).getDate();
  } else if (selfOrMonth) {
    dateOrYear.setMonth(dateOrYear.getMonth() + 1, 0);
    return dateOrYear.getDate();
  } else {
    return new Date(dateOrYear.getFullYear(), dateOrYear.getMonth() + 1, 0).getDate();
  }
}
//endregion
//region getDayOfYear
/**
 * 当前日期是一年中的第几天
 * @param date		通过date查询
 * @param [self]	是否修改传入的日期
 * @return 第几天
 */
function getDayOfYear(date: Date, self?: boolean): number;
/**
 * 当前日期是一年中的第几天
 * @param year	查询的年
 * @param month	查询的月(1-12)
 * @param day	查询的日
 * @return		第几天
 */
function getDayOfYear(year: number, month: number, day: number): number;
function getDayOfYear(dateOrYear: Date | number, selfOrMonth?: number | boolean, day?: number): number {
  const isNum = typeof dateOrYear === 'number';
  if (isNum) {
    // @ts-ignore
    dateOrYear = new Date(dateOrYear, selfOrMonth! - 1, day!);
  }
  // @ts-ignore
  return _getDiff(dateOrYear.getTime(), startOfDate(dateOrYear, 'year', isNum || selfOrMonth).getTime(), MILLISECONDS_IN_DAY) + 1;
}
//endregion
//region getWeekOfMonth
function getWeekOfMonth(
  param: (
    | {
        date: Date;
      }
    | {
        year: number;
        month: number;
        day: number;
      }
  ) & {
    startOfWeek?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  }
): number {
  let date;
  if ('date' in param) {
    date = param.date;
  } else {
    date = new Date(param.year, param.month - 1, param.day);
  }
  const { startOfWeek = 1 } = param;
  const week = (date.getDay() + 8 - startOfWeek) % 7;
  return Math.ceil((date.getDate() - week) / 7) + (week > 0 ? 1 : 0);
}
//endregion
//region dateFormat
const DATEFORMAT_CACHE_SIZE = 10;
const dateFormatCache: DateFormatCache = Object.create(null);
const dateFormatCacheKeys: Array<string> = new Array<string>(DATEFORMAT_CACHE_SIZE);
let dateFormatCacheIndex = 0;
//region 时间的Formatter
const timeFormatter: TimeTokenFormatter = {
  yy(date: Date) {
    const y = date.getFullYear() % 100;
    return pad(y, 2);
  },
  yyyy(date: Date) {
    return date.getFullYear();
  },
  Q(date: Date) {
    return Math.ceil((date.getMonth() + 1) / 3);
  },
  QQ(date: Date, dateLocale: Required<DateLocale>) {
    return dateLocale.quarters[Math.floor(date.getMonth() / 3)];
  },
  M(date: Date) {
    return date.getMonth() + 1;
  },
  MM(date: Date) {
    return pad(date.getMonth() + 1, 2);
  },
  MMM(date: Date, dateLocale: Required<DateLocale>) {
    return dateLocale.monthsShort[date.getMonth()];
  },
  MMMM(date: Date, dateLocale: Required<DateLocale>) {
    return dateLocale.months[date.getMonth()];
  },
  d(date: Date) {
    return date.getDate();
  },
  dd(date: Date) {
    return pad(date.getDate(), 2);
  },
  D(date: Date) {
    return getDayOfYear(date);
  },
  DD(date: Date) {
    return pad(getDayOfYear(date), 3);
  },
  e(date: Date) {
    return date.getDay();
  },
  E(date: Date) {
    return date.getDay() || 7;
  },
  EE(date: Date, dateLocale: Required<DateLocale>) {
    return dateLocale.weeksShort[date.getDay()];
  },
  EEE(date: Date, dateLocale: Required<DateLocale>) {
    return dateLocale.weeks[date.getDay()];
  },
  H(date: Date) {
    return date.getHours();
  },
  HH(date: Date) {
    return pad(date.getHours(), 2);
  },
  h(date: Date) {
    return date.getHours() % 12 || 12;
  },
  hh(date: Date) {
    return pad(date.getHours() % 12 || 12, 2);
  },
  K(date: Date) {
    return date.getHours() % 12;
  },
  KK(date: Date) {
    return pad(date.getHours() % 12, 2);
  },
  k(date: Date) {
    return date.getHours() || 24;
  },
  kk(date: Date) {
    return pad(date.getHours() || 24, 2);
  },
  m(date: Date) {
    return date.getMinutes();
  },
  mm(date: Date) {
    return pad(date.getMinutes(), 2);
  },
  s(date: Date) {
    return date.getSeconds();
  },
  ss(date: Date) {
    return pad(date.getSeconds(), 2);
  },
  S(date: Date) {
    return Math.floor(date.getMilliseconds() / 100);
  },
  SS(date: Date) {
    return pad(Math.floor(date.getMilliseconds() / 10), 2);
  },
  SSS(date: Date) {
    return pad(date.getMilliseconds(), 3);
  },
  a(date: Date, dateLocale: Required<DateLocale>) {
    return date.getHours() < 12 ? dateLocale.am : dateLocale.pm;
  },
  // @ts-ignore
  Z(date: Date, dateLocale: Required<DateLocale>, timezoneOffset?: number) {
    return formatTimezone(':', timezoneOffset);
  },
  // @ts-ignore
  ZZ(date: Date, dateLocale: Required<DateLocale>, timezoneOffset?: number) {
    return formatTimezone('', timezoneOffset);
  },
};
//endregion
//region 格式化时区
function formatTimezone(separator: string, timezoneOffset?: number) {
  const offset = timezoneOffset != null ? timezoneOffset : TIMEZONE_OFFSET_IN_MINUTE;
  const sign = offset > 0 ? '-' : '+';
  const absOffset = Math.abs(offset);
  const hours = Math.floor(absOffset / 60);
  const minutes = absOffset % 60;
  return sign + pad(hours, 2) + separator + pad(minutes, 2);
}
//endregion
/**
 * 格式化时间
 * @param date			日期
 * @param format		格式化模板, 可以用 单引号转义
 * @param [option]		选项
 * @return 格式化后的字符串
 */
function dateFormat(date: Date, format = 'yyyy-MM-dd HH:mm:ss', option?: DateFormatOption): string {
  if (!format) {
    return '';
  }
  const { dateLocale, timezoneOffset } = option || {};
  const locale = dateLocale ? Object.assign({}, defaultDateLocale, dateLocale) : defaultDateLocale;
  //region 校正时区
  if (timezoneOffset != null && timezoneOffset !== TIMEZONE_OFFSET_IN_MINUTE) {
    date = new Date(date.getTime() - (timezoneOffset - TIMEZONE_OFFSET_IN_MINUTE) * MILLISECONDS_IN_MINUTE);
  }
  //endregion
  const key = format;
  let result = '';
  if (!dateFormatCache[key]) {
    //region 组装结果并缓存tokens
    const dateFormatTokens: Array<DateFormatToken> = [];
    let match;
    let lastIndex = 0;
    let str = '';
    while ((match = tokenRegex.exec(format)) != null) {
      if (match.index !== lastIndex) {
        str += format.slice(lastIndex, match.index);
      }
      lastIndex = tokenRegex.lastIndex;
      const text = match[0];
      if (text in timeFormatter) {
        if (str) {
          result += str;
          dateFormatTokens.push({
            type: 'text',
            value: str,
          });
          str = '';
        }
        result += timeFormatter[text as FormatToken](date, locale, timezoneOffset);
        dateFormatTokens.push({ type: text } as DateFormatToken);
      } else if (text[0] === "'" && text.length > 1) {
        str += replaceString(text.slice(1, text.length - 1), "''", "'");
      } else {
        str += text;
      }
    }
    if (lastIndex < format.length) {
      str += format.slice(lastIndex);
    }
    if (str) {
      result += str;
      dateFormatTokens.push({
        type: 'text',
        value: str,
      });
    }
    if (dateFormatCacheKeys[dateFormatCacheIndex] != null) {
      delete dateFormatCache[dateFormatCacheKeys[dateFormatCacheIndex]];
    }
    dateFormatCacheKeys[dateFormatCacheIndex] = key;
    dateFormatCache[key] = dateFormatTokens;
    dateFormatCacheIndex = (dateFormatCacheIndex + 1) % DATEFORMAT_CACHE_SIZE;
    //endregion
  } else {
    for (const token of dateFormatCache[key]) {
      if (token.type === 'text') {
        result += token.value;
      } else {
        result += timeFormatter[token.type](date, locale, timezoneOffset);
      }
    }
  }
  return result;
}
//endregion
//region dateParse
const dateParseCache: DateParseCache = Object.create(null);
const dateParseCacheKeys: Array<string> = new Array<string>(DATEFORMAT_CACHE_SIZE);
let dateParseCacheIndex = 0;
/**
 * 内部解析时间
 * @param dateStr	日期字符串
 * @param format	格式化模板, 可以用 单引号转义, 可以直传正则表达式
 * @param [option]	选项
 * @return 日期对象
 */
function _dateParse(dateStr: string, format: string | RegExp, option?: DateParseOption): Date | null {
  const { dateLocale, timezoneOffset } = option || {};
  const locale = dateLocale ? Object.assign({}, defaultDateLocale, dateLocale) : defaultDateLocale;
  const date: any = {
    year: null,
    month: 0,
    day: 1,
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
    timezoneOffset: null,
  };
  let match;
  if (format instanceof RegExp) {
    match = format.exec(dateStr);
  } else {
    const key = JSON.stringify({
      format,
      dateLocale,
    });
    if (!dateParseCache[key]) {
      //region 生成正则表达式和分组信息并缓存
      const quarters = '(' + locale.quarters.join('|') + ')';
      const monthsShort = '(?<MMM>' + locale.monthsShort.join('|') + ')';
      const months = '(?<MMMM>' + locale.months.join('|') + ')';
      const weeksShort = '(' + locale.weeksShort.join('|') + ')';
      const weeks = '(' + locale.weeks.join('|') + ')';
      const am = `(?<a>${locale.am}|${locale.pm})`;
      const regexText = format.replace(tokenRegex, (match: string) => {
        if (match === 'yy') {
          return '(?<yy>\\d{1,2})';
        } else if (match === 'yyyy') {
          return '(?<yyyy>\\d{1,4})';
        } else if (match === 'Q') {
          return '(\\d)';
        } else if (match === 'QQ') {
          return quarters;
        } else if (match === 'M') {
          return '(?<M>\\d{1,2})';
        } else if (match === 'MM') {
          return '(?<M>\\d{2})';
        } else if (match === 'MMM') {
          return monthsShort;
        } else if (match === 'MMMM') {
          return months;
        } else if (match === 'd') {
          return '(?<d>\\d{1,2})';
        } else if (match === 'dd') {
          return '(?<d>\\d{2})';
        } else if (match === 'D' || match === 'DD') {
          return '(\\d{1,3})';
        } else if (match === 'e' || match === 'E') {
          return '(\\d)';
        } else if (match === 'EE') {
          return weeksShort;
        } else if (match === 'EEE') {
          return weeks;
        } else if (match === 'H') {
          return '(?<H>\\d{1,2})';
        } else if (match === 'HH') {
          return '(?<H>\\d{2})';
        } else if (match === 'h') {
          return '(?<h>\\d{1,2})';
        } else if (match === 'hh') {
          return '(?<h>\\d{2})';
        } else if (match === 'K') {
          return '(?<K>\\d{1,2})';
        } else if (match === 'KK') {
          return '(?<K>\\d{2})';
        } else if (match === 'k') {
          return '(?<k>\\d{1,2})';
        } else if (match === 'kk') {
          return '(?<k>\\d{2})';
        } else if (match === 'm') {
          return '(?<m>\\d{1,2})';
        } else if (match === 'mm') {
          return '(?<m>\\d{2})';
        } else if (match === 's') {
          return '(?<s>\\d{1,2})';
        } else if (match === 'ss') {
          return '(?<s>\\d{2})';
        } else if (match === 'S') {
          return '(?<S>\\d)';
        } else if (match === 'SS') {
          return '(?<S>\\d{2})';
        } else if (match === 'SSS') {
          return '(?<S>\\d{3})';
        } else if (match === 'a') {
          return am;
        } else if (match === 'Z') {
          return '(?<Z>Z|[+-]\\d{2}:\\d{2})';
        } else if (match === 'ZZ') {
          return '(?<ZZ>Z|[+-]\\d{2}\\d{2})';
        } else {
          if (match[0] === "'") {
            match = replaceString(match.slice(1, match.length - 1), "''", "'");
          }
          return match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }
      });
      if (dateParseCacheKeys[dateParseCacheIndex] != null) {
        delete dateParseCache[dateParseCacheKeys[dateParseCacheIndex]];
      }
      dateParseCacheKeys[dateParseCacheIndex] = key;
      dateParseCache[key] = { regex: new RegExp(regexText) };
      dateParseCacheIndex = (dateParseCacheIndex + 1) % DATEFORMAT_CACHE_SIZE;
      //endregion
    }
    const { regex } = dateParseCache[key];
    match = dateStr.match(regex);
  }
  if (match != null && match.groups) {
    //region 获取时间信息
    const groups = match.groups;
    if (groups.yyyy) {
      date.year = parseInt(groups.yyyy);
    } else if (groups.yy) {
      date.year = 2000 + parseInt(groups.yy);
    }
    if (groups.M) {
      date.month = parseInt(groups.M) - 1;
    } else if (groups.MMM) {
      date.month = locale.monthsShort.indexOf(groups.MMM);
    } else if (groups.MMMM) {
      date.month = locale.months.indexOf(groups.MMMM);
    }
    if (groups.d) {
      date.day = parseInt(groups.d);
    }
    if (groups.H) {
      date.hour = parseInt(groups.H);
    } else if (groups.k) {
      date.hour = parseInt(groups.k) % 24;
    } else if (groups.h) {
      date.hour = parseInt(groups.h) % 12;
      if (groups.a && groups.a === locale.pm) {
        date.hour += 12;
      }
    } else if (groups.K) {
      date.hour = parseInt(groups.K);
      if (groups.a && groups.a === locale.pm) {
        date.hour += 12;
      }
    }
    if (groups.m) {
      date.minute = parseInt(groups.m);
    }
    if (groups.s) {
      date.second = parseInt(groups.s);
    }
    if (groups.S) {
      const val = groups.S;
      date.millisecond = parseInt(val) * 10 ** (3 - val.length);
    }
    if (timezoneOffset == null && (groups.Z || groups.ZZ)) {
      const tzString = groups.Z ? replaceString(groups.Z, ':', '') : groups.ZZ;
      // @ts-ignore
      date.timezoneOffset = (tzString[0] === '+' ? -1 : 1) * (60 * tzString.slice(1, 3) + 1 * tzString.slice(3, 5));
    }
    //endregion
  } else {
    return null;
  }
  const res = new Date(date.year, date.month, date.day, date.hour, date.minute, date.second, date.millisecond);
  //region 校正时区
  const offset = timezoneOffset != null ? timezoneOffset : date.timezoneOffset;
  if (offset != null && offset !== TIMEZONE_OFFSET_IN_MINUTE) {
    res.setMinutes(res.getMinutes() + offset - TIMEZONE_OFFSET_IN_MINUTE);
  }
  //endregion
  return res;
}
const defaultParseFormat = [
  /(?<yyyy>\d{1,4})(?<sep>[-/.])(?<M>\d{1,2})\k<sep>(?<d>\d{1,2})(?:\s+(?<H>\d{1,2}):(?<m>\d{1,2})(?::(?<s>\d{1,2}))?)?/,
  /(?<yyyy>\d{1,4})年(?<M>\d{1,2})月(?<d>\d{1,2})日\s*(?<H>\d{1,2})时(?<m>\d{1,2})分(?:(?<s>\d{1,2})秒)?/,
  /(?<yyyy>\d{1,4})年(?<M>\d{1,2})月(?<d>\d{1,2})日(?:\s*(?<H>\d{1,2}):(?<m>\d{1,2})(?::(?<s>\d{1,2}))?)?/,
];
/**
 * 解析时间
 * @param dateStr	日期字符串
 * @param formats	格式化模板, 可以用 单引号转义, 可以直传正则表达式(也可以传这些类型的数组, 直到一个解析成功)
 * @param option	选项
 * @return 日期对象
 */
function dateParse(dateStr: string, formats: string | RegExp | string[] | RegExp[] = defaultParseFormat, option?: DateParseOption): Date | null {
  if (Array.isArray(formats)) {
    let date: Date | null = null;
    for (const format of formats) {
      date = _dateParse(dateStr, format, option);
      if (date != null) {
        return date;
      }
    }
    return date;
  } else {
    return _dateParse(dateStr, formats, option);
  }
}
//endregion

export {
  pad,
  numberToString,
  getUid,
  replaceString,
  startOfDate,
  endOfDate,
  getDateDiff,
  daysInMonth,
  getDayOfYear,
  getWeekOfMonth,
  dateFormat,
  dateParse,
};
