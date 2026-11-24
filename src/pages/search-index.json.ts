import {lessons,listItems} from '../lib/catalog';
export function GET(){return Response.json(listItems(lessons,true))}
