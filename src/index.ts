import { CategoriesTree } from "./interfaces/CategoriesTree";
import { Parser, PathBuilder } from "./parser";

const csvFileUrl = "https://pics.ebaystatic.com/aw/pics/catchanges/US_NewStructure(Oct2019).csv";

const parser = new Parser(csvFileUrl)
const pathBuilder = new PathBuilder()

  
const startScript = async () => {
    await parser.downloadFile()
    await parser.toJson()
    await parser.saveJson()
    const path = pathBuilder.findPath('73464');
    const res: CategoriesTree = parser.getResult()
    console.log(res)
    console.log(path);

}

startScript()