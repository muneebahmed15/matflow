const GSM7_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";

const GSM7_EXTENDED = '^{}\\[~]|€';

export type SmsSegmentInfo = {
  length: number;
  segments: number;
  encoding: 'gsm7' | 'ucs2';
  charsPerSegment: number;
};

function isGsm7Char(char: string): boolean {
  return GSM7_BASIC.includes(char) || GSM7_EXTENDED.includes(char);
}

export function smsSegmentInfo(body: string): SmsSegmentInfo {
  let gsmLength = 0;
  for (const char of body) {
    if (!isGsm7Char(char)) {
      const length = [...body].length;
      const singleLimit = 70;
      const multiLimit = 67;
      const segments = length <= singleLimit ? 1 : Math.ceil(length / multiLimit);
      return {
        length,
        segments,
        encoding: 'ucs2',
        charsPerSegment: length <= singleLimit ? singleLimit : multiLimit,
      };
    }
    gsmLength += GSM7_EXTENDED.includes(char) ? 2 : 1;
  }

  const singleLimit = 160;
  const multiLimit = 153;
  const segments = gsmLength <= singleLimit ? 1 : Math.ceil(gsmLength / multiLimit);
  return {
    length: gsmLength,
    segments,
    encoding: 'gsm7',
    charsPerSegment: gsmLength <= singleLimit ? singleLimit : multiLimit,
  };
}
