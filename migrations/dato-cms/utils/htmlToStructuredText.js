import { parse } from "parse5";
import _datocmsHtmlToStructuredText from "datocms-html-to-structured-text";
const {
  parse5ToStructuredText,
  htmlToStructuredText: _htmlToStructuredText,
  Options,
} = _datocmsHtmlToStructuredText;
import { validate } from "datocms-structured-text-utils";

export default async function htmlToStructuredText(html, settings) {
  if (!html) {
    return null;
  }

  const result = await parse5ToStructuredText(
    parse(html, {
      sourceCodeLocationInfo: true,
    }),
    settings,
  );

  const validationResult = validate(result);

  if (!validationResult.valid) {
    throw new Error(validationResult.message);
  }

  return result;
}
