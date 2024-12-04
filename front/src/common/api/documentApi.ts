import type { NewDocumentResponse } from 'common/api/osrdEditoastApi';
import mainConfig from 'config/config';

export const getDocumentUrl = (documentKey: number) =>
  `${mainConfig.proxy_editoast}/documents/${documentKey}`;

export const getDocument = async (documentKey: number): Promise<Blob> => {
  const res = await fetch(getDocumentUrl(documentKey));
  return res.blob();
};

export const postDocument = async (image: Blob) => {
  const res = await fetch(`${mainConfig.proxy_editoast}/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': image.type || 'application/octet-stream',
    },
    body: image,
  });
  const data: NewDocumentResponse = await res.json();
  return data.document_key;
};
