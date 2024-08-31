import { Injectable } from "@nestjs/common";
import { SortCondition } from "../types/schema.types";

@Injectable()
export class Sort {
	constructor() {}

    /**
     * Takes the sort query parameter and returns the sort object
     */

    createSortArray(sort: string): SortCondition[] {

        if(!sort) return []

        const array = sort.split(',')
        const sortArray = []

        for(const item of array){
            const direction = item.lastIndexOf('.')
            const column = item.substring(0, direction)
            const operator = item.substring(direction+1)
            sortArray.push({column, operator: operator.toUpperCase()})
        }

        return sortArray
    }
}