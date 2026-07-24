func ValidateToken(token string) (*Token, error) {
   if token == "" {
       return nil, errors.New("empty token")
   }
   return parseToken(token)
}