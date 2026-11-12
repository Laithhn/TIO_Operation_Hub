import type { typo } from 'assets/styles';


export interface TitleProps {
  readonly title: string;
  readonly titleType: keyof Pick<typeof typo.typoSet, 'headline' | 'title' | 'label'>;
  readonly subTitle: string;
  readonly centerTitle: boolean;
}
