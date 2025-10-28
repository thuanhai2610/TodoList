import { IsNotEmpty, Matches } from 'class-validator';

export class LoginDTO {
  @IsNotEmpty({ message: 'Email không được để trống' })
  @Matches(/^[\w.-]+@gmail\.com$/, {
    message: 'Email phải có @gmail.com',
  })
  email: string;

  @IsNotEmpty({ message: 'Password không được để trống' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/, {
    message: 'Password phải có ít nhất 6 ký tự và chứa cả chữ và số',
  })
  password: string;
}
