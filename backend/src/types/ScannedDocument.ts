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
  ocrEngine: string;
}
