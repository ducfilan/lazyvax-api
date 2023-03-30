import { MaxInt, SupportingLanguagesMap } from '@common/consts'
import { validateSkip, validateLimit } from './common.validator'

export const apiSearchSetValidator = ({ keyword, skip, limit, languages }, defaultLangCodes: string[]) => {
  skip = Number(skip)
  limit = Number(limit)

  if (!validateSkip(skip)) {
    throw new Error('invalid skip value')
  }

  if (!validateLimit(limit)) {
    throw new Error('invalid limit value')
  }

  if (!keyword) {
    throw new Error('keyword not provided')
  }

  languages = (languages || '').split(',')
  if (!languages || languages.length === 0 || !languages.find(lang => SupportingLanguagesMap[lang])) {
    languages = defaultLangCodes
  }

  return { keyword, skip, limit, languages }
}

export const apiGetSetsInCategoriesValidator = ({ skip, limit }) => {
  skip = Number(skip)
  limit = Number(limit)

  if (!validateSkip(skip)) {
    throw new Error('invalid skip value')
  }

  if (!validateLimit(limit)) {
    throw new Error('invalid limit value')
  }

  return { skip, limit }
}

export const apiGetSetValidator = ({ skip, limit }) => {
  if (!skip) skip = 0
  if (!limit) limit = MaxInt

  skip = Number(skip)
  limit = Number(limit)

  if (!validateSkip(skip)) {
    throw new Error('invalid skip value')
  }

  if (!validateLimit(limit, MaxInt)) {
    throw new Error('invalid limit value')
  }

  return { skip, limit }
}
