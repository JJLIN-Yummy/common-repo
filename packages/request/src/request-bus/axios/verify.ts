import { codeEnum } from '@/enums/codeEnum';

export type codeType = boolean | number;
export function verifyCode(code: boolean | number) {
  if (code === codeEnum.OK) {
    return true;
  }
  return false;
}
