import { Parser } from 'xml2js';

export function xmlStringToJson(xml: string): Promise<any> {

  return new Promise((resolve, reject) => {
    try {
      const parser = new Parser({
        explicitArray: false,
        explicitChildren: true,
        preserveChildrenOrder: true
      });
      parser.parseString(xml, (err: any, json: any) => {
        if (err) {
          return reject(err);
        }
        resolve(json);
        return;
      });
    } catch (parseErr) {
      reject(parseErr);
      return;
    }
  });
}

