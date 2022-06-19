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

export type FilterApplier = (qry: Knex.QueryBuilder, col: string, val: any) => void;
export type OperatorTable = Map<string, FilterApplier>;

const stdOptable = new Map<string, FilterApplier>();

stdOptable.set('between', (qry, col, val) => qry.orWhereBetween(col, val));
stdOptable.set('contains', (qry, col, val) => qry.orWhereILike(col, '%' + val + '%'));
stdOptable.set('startsWith', (qry, col, val) => qry.orWhereILike(col, val + '%'));
stdOptable.set('endsWith', (qry, col, val) => qry.orWhereILike(col, '%' + val));

[ ['equalTo', '='],
  ['different', '!='],
  ['lesser', '<'],
  ['lesserOrEqual', '<='],
  ['greater', '>'],
  ['greaterOrEqual', '>='] ]
.forEach(([op, sym]) => stdOptable.set(op, (qry, col, val) => qry.orWhere(col, sym, val)));

// Read 'or' as a verb; a more verbose equivalent name would be 'combineFiltersWithOr'
function orFilters(query: Knex.QueryBuilder, filters: Filter[], extraOptable?: OperatorTable) {
  for (const filter of filters) {
    if (stdOptable.has(filter.operator)) {
      (stdOptable.get(filter.operator) as FilterApplier)(query, filter.name, filter.value);
    } else if (extraOptable?.has(filter.operator)) {
      (extraOptable.get(filter.operator) as FilterApplier)(query, filter.name, filter.value);
    } else {
      throw `Unsupported filter operator ${filter.operator}`;
    }
  }
}

export function addFilters(query: Knex.QueryBuilder, filters: Filter[], extraOptable?: OperatorTable) {
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
    query.andWhere(function() { orFilters(this, filters, extraOptable) });
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
  if (perPage <= 0) throw 'Results per page must be non-negative';

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