export default abstract class FormatParser {
    abstract canParse(data: string): boolean;
    abstract parse(data: string): unknown;
}
