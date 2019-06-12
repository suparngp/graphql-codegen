 
interface SomeInterface {

    override var interfaceProperty: String
}

class RootClass(var rootClassProperty: String)

class MyClass(rootClassProperty: String, override var interfaceProperty: String, var MyProperty: String) : RootClass(rootClassProperty = rootClassProperty), SomeInterface