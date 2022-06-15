import { Request } from 'express';
import { Knex } from "knex";
import knex from '../database';

export type Filter = {
  name: string,
  operator: string,
  value: any
};

export type SearchParams = {
  userid: number,
  page: number,
  perPage: number,
  order: string,
  direction: string,
  filters: Filter[]
};

const operatorNameToSymbol = new Map();
[ ['equalTo', '='],
  ['different', '!='],
  ['lesser', '<'],
  ['lesserOrEqual', '<='],
  ['greater', '>'],
  ['greaterOrEqual', '>='] ]
.forEach(([k, v]) => operatorNameToSymbol.set(k, v));

// Read 'or' as a verb; a more verbose equivalent name would be 'combineFiltersWithOr'
function orFilters(query: Knex.QueryBuilder, filters: Filter[]) {
  for (const filter of filters) {
    const name = filter.name;
    const op   = filter.operator;
    const val  = filter.value;
    if (op == 'between') {
      query.orWhereBetween(name, val);
    } else if (op == 'contains' || op == 'startsWith' || op == 'endsWith') {
      let x = val;
      if (op == 'contains' || op == 'startsWith') x = x + '%';
      if (op == 'contains' || op == 'endsWith')   x = '%' + x;
      query.orWhereILike(name, x);
    } else if (operatorNameToSymbol.has(op)) {
      query.orWhere(name, operatorNameToSymbol.get(op), val);
    } else {
      throw `Unsupported filter.operator ${op}`;
    }
  }
}

export function addFilters(query: Knex.QueryBuilder, filters: Filter[]) {
  // Filters on the same field are combined with OR
  const byField = new Map();
  for (const filter of filters) {
    if (byField.has(filter.name)) {
      byField.get(filter.name).push(filter)
    } else {
      byField.set(filter.name, [filter]);
    }
  }
  for (const filters of byField.values()) {
    query.andWhere(function() { orFilters(this, filters) });
  }
}

export function validateSearchParams(req: Request, orderSupportedFields: string[]): SearchParams | string {
  const order = req.query.order as string ?? orderSupportedFields[0]
  const direction = req.query.direction as string ?? 'desc'
  const page = Number(req.query.page ?? 1)
  const perPage = Number(req.query.perPage ?? 27)

  let filters = [];
  try {
    const filterArray = [req.query.filters ?? []].flat() as string[];
    filters = filterArray.map(x => JSON.parse(x));
  } catch(err) {
    return 'Malformed filters, could not parse as JSON';
  }

  if (page <= 0) throw 'Page must be non-negative';
  if (perPage <= 0) throw 'Works per page must be non-negative';

  if (!orderSupportedFields.includes(order)) {
    return `'order' must have one of these values: ${orderSupportedFields.join(', ')}`
  }

  if (direction != 'asc' && direction != 'desc') {
    return `'direction' must be 'asc' or 'desc'`;
  }

  const params = {
    userid: req.user.id,
    page, perPage, order, direction, filters
  };

  return params;
}