import { CategoriesTree } from "./interfaces/CategoriesTree";

const download = require('download');
const fs = require('fs');
const parse = require('csv-parse');


export class Parser {
    private jsonCategoriesString: string = ''
    private records: string[] = []

    private readonly url: string
    private csvFileName: string = ''
    private readonly csvFolderPath: string

    constructor(
        url: string,
        csvFolderPath: string = "./categories/"
    ) {
        this.url = url
        this.csvFolderPath = csvFolderPath
    }

    async downloadFile() {
        await download(this.url, this.csvFolderPath)
        const parsedUrl = this.url.split("/");
        this.csvFileName = parsedUrl?.[parsedUrl.length - 1];
    }

    async toJson() {
        await this.convertCsvToJson()
        await this.convertArrayToJson()
        return this.jsonCategoriesString
    }

    private async convertCsvToJson() {
        const parser =
            fs.createReadStream(this.csvFolderPath + this.csvFileName)
                .pipe(
                    parse({
                        bom: true,
                        relax: true,
                        from: 4,
                        escape: "\\"
                    }))
        for await (const record of parser) {
            for (let i = 0; i < record.length - 1; i++) {
                if (record[i] !== "") {
                    if (record[i][0] == `"`) {
                        record[i] = record[i].slice(1, -1).replace(`"`, `\\"`)
                    }
                }
            }
            this.records.push(record)
        }
    }

    private async convertArrayToJson() {
        let categories = new categoriesBuilder()
        for await (const record of this.records) {
            for (let i = 0; i < record.length - 1; i++) {
                if (record[i] !== "") {
                    categories.addCategory(
                        record[i],
                        record[record.length - 1],
                        i
                    )
                }
            }
        }
        this.jsonCategoriesString = categories.getJsonString()
    }

    getResult() {
        const categories: CategoriesTree = JSON.parse(this.jsonCategoriesString)
        return categories
    }

    saveJson(
        fileName: string = "result.json",
        folderPath: string = "./categories/"
    ) {
        fs.writeFileSync(folderPath + fileName, this.jsonCategoriesString)
    }
}

class categoriesBuilder {
    private jsonString: string
    private head: number

    constructor(string: string = "") {
        this.jsonString = string
        this.head = 0
    }

    addCategory(name: string, value: string, column: number) {
        if (column == this.head) {
            this.addSibling(name, value)
        } else if (column == this.head + 1) {
            this.addChild(name, value)
        } else if (column < this.head) {
            let levelDifference = this.head - column
            this.addAncestor(name, value, levelDifference)
        } else {
            throw new Error(
                'Column is higher than current head'
            )
        }
        this.head = column
    }

    private addSibling(name: string, value: string) {
        this.jsonString += `},{"name":"${name}","value":${value}`
    }

    private addChild(name: string, value: string) {
        this.jsonString += `,"subSchemas":[{"name":"${name}","value":${value}`
    }

    private addAncestor(name: string, value: string, levelDifference: number) {
        for (let i = 0; i < levelDifference; i++) {
            this.jsonString += `}]`
        }
        this.jsonString += `},{"name":"${name}","value":${value}`
    }

    private complementStartAndEnd() {
        this.jsonString = `[` + this.jsonString.slice(2)
        for (let i = 0; i < this.head; i++) {
            this.jsonString += `}]`
        }
        this.jsonString += `}]`
    }

    getJsonString() {
        this.complementStartAndEnd()
        const result = this.jsonString
        this.reset()
        return result
    }

    reset() {
        this.jsonString = ""
        this.head = 0
    }
}

export class PathBuilder {
    private fileName: string
    private folderPath: string
    private pathArray: string[] = []
    private searchValue: string = ""
    private generatedPath: string = ""

    constructor(
        fileName: string = "result.json",
        folderPath: string = "./categories/"
    ) {
        this.fileName = fileName
        this.folderPath = folderPath
    }

    findPath(searchValue: string) {
        this.searchValue = searchValue
        let rawData: string = fs
            .readFileSync(this.folderPath + this.fileName)
            .toString()
        let jsonArray: JSON[] = JSON.parse(rawData)

        for (let i = 0; i < jsonArray.length; i++) {
            this.search(jsonArray[i])
        }
        let result: string = this.generatedPath
        this.reset()
        return result
    }

    search(categoriesTree: any, depth = 0) {
        this.pathArray[depth] = categoriesTree.name

        if (categoriesTree.value == this.searchValue) {
            this.pathGenerator(depth)
            return
        } else {
            if (categoriesTree.hasOwnProperty("subSchemas")) {
                for (let i = 0; i < categoriesTree.subSchemas.length; i++) {
                    this.search(categoriesTree.subSchemas[i], depth + 1)
                }
            }
        }
    }

    pathGenerator(depth: number) {
        for (let i = 0; i < depth; i++) {
            this.generatedPath += this.pathArray[i] + " > "
        }
        this.generatedPath += this.pathArray[depth]
    }

    reset() {
        this.pathArray = []
        this.generatedPath = ""
    }
}
