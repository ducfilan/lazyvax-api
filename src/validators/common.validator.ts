import { MaxPaginationLimit } from '@/common/consts/constants'

export const validateSkip = (skip) => (Number.isInteger(skip) && skip >= 0)

export const validateLimit = (limit, maxPaginationLimit = MaxPaginationLimit) => (Number.isInteger(limit) && limit <= maxPaginationLimit && limit > 0)
