export type DocType = 'passport' | 'national_id';
export type Sex = 'M' | 'F' | 'X' | '';

export interface ScannedFields {
  surname: string;
  givenNames: string;
  documentNumber: string;
  nationality: string;
  dateOfBirth: string;
  sex: Sex;
  expiryDate: string;
}

export interface ManualFields {
  patronymic: string;
  patronymicCyr: string;
  surnameCyr: string;
  givenNamesCyr: string;
  issuingAuthority: string;
  issuingAuthorityCyr: string;
  address: string;
  phone: string;
  email: string;
}

export interface SuggestedManual {
  patronymic: string;
  patronymicCyr: string;
  surnameCyr: string;
  givenNamesCyr: string;
  issuingAuthority: string;
  issuingAuthorityCyr: string;
  address: string;
}

export interface ScanWarning {
  field: string;
  message: string;
}

export interface ScannedImages {
  frontUrl: string;
  backUrl?: string;
}

export interface ScannedDocument {
  docType: DocType;
  fields: ScannedFields;
  warnings: ScanWarning[];
  images: ScannedImages;
  rawMrz: string[];
  visualText: string;
  suggestedManual: SuggestedManual;
  ocrEngine: string;
}

export interface ScannerResult {
  docType: DocType;
  fields: ScannedFields;
  manual: ManualFields;
  warnings: ScanWarning[];
  images: ScannedImages;
  rawMrz: string[];
  visualText: string;
  ocrEngine: string;
}

export const EMPTY_MANUAL: ManualFields = {
  patronymic: '',
  patronymicCyr: '',
  surnameCyr: '',
  givenNamesCyr: '',
  issuingAuthority: '',
  issuingAuthorityCyr: '',
  address: '',
  phone: '',
  email: '',
};
